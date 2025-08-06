// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, deleteDoc, addDoc, getDoc, updateDoc, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice as leaveVoiceAction, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction, updateLastActive } from '@/lib/actions/voiceActions';
import { leaveRoom, addTrackToPlaylist as addTrackAction, removeTrackFromPlaylist as removeTrackAction, controlPlayback as controlPlaybackAction } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean; 
    isMinimized: boolean;
    isSpeakerMuted: boolean;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteScreenStreams: Record<string, MediaStream>;
    remoteVideoStreams: Record<string, MediaStream>;
    localStream: MediaStream | null;
    isSharingScreen: boolean;
    isSharingVideo: boolean;
    setActiveRoomId: (id: string | null) => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    startVideo: () => Promise<void>;
    stopVideo: () => Promise<void>;
    switchCamera: () => Promise<void>;
    joinVoice: (options?: { muted: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    leaveVoice: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    toggleSpeakerMute: () => void;
    minimizeRoom: () => void;
    expandRoom: () => void;
    // Music Player
    livePlaylist: PlaylistTrack[];
    currentTrack: (PlaylistTrack & { isPlaying: boolean }) | null;
    isCurrentUserDj: boolean;
    isDjActive: boolean;
    addTrackToPlaylist: (data: { fileName: string, fileDataUrl: string }) => Promise<void>;
    removeTrackFromPlaylist: (trackId: string) => Promise<void>;
    togglePlayback: () => Promise<void>;
    skipTrack: (direction: 'next' | 'previous') => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isSharingVideo, setIsSharingVideo] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
    
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const videoSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const lastActiveUpdateTimestamp = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const speakingDetectionIntervals = useRef<Record<string, NodeJS.Timeout>>({});
    const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});


    const self = useMemo(() => participants.find(p => p.uid === user?.uid), [participants, user?.uid]);
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;
    const isCurrentUserDj = isConnected && !!activeRoom?.djUid && activeRoom.djUid === user?.uid;
    const isDjActive = !!activeRoom?.djUid;
    
    const currentTrack = useMemo(() => {
        if (!activeRoom || activeRoom.currentTrackIndex === undefined || activeRoom.currentTrackIndex < 0 || activeRoom.currentTrackIndex >= livePlaylist.length) {
            return null;
        }
        return {
            ...livePlaylist[activeRoom.currentTrackIndex],
            isPlaying: !!activeRoom.isMusicPlaying
        };
    }, [activeRoom, livePlaylist]);

    // Teardown logic
    const _cleanupAndResetState = useCallback(async () => {
        Object.values(speakingDetectionIntervals.current).forEach(clearInterval);
        speakingDetectionIntervals.current = {};
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);
        setIsSharingVideo(false);

        if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        setRemoteVideoStreams({});
        screenSenderRef.current = {};
        videoSenderRef.current = {};
        iceCandidateQueue.current = {};
        setIsConnecting(false);
    }, [localStream, localScreenStream]);
    
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoomId, user]);

    // Speaking detection logic
    const setupSpeakingDetection = useCallback((stream: MediaStream, userId: string) => {
        if (typeof window.AudioContext === 'undefined' || !stream.getAudioTracks().length) return () => {};
        
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContext();
        }
        const audioContext = audioContextRef.current;
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512;
        analyser.minDecibels = -120;
        analyser.maxDecibels = -30;
        analyser.smoothingTimeConstant = 0.4;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let lastSpokeTime = 0;
        
        const checkSpeaking = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for(const amplitude of dataArray) {
                sum += amplitude * amplitude;
            }
            const volume = Math.sqrt(sum / dataArray.length);
            const isCurrentlySpeaking = volume > 20;

            setParticipants(prev => {
                const participant = prev.find(p => p.uid === userId);
                if (!participant || participant.isSpeaking === isCurrentlySpeaking) return prev;
                if (isCurrentlySpeaking) lastSpokeTime = Date.now();
                return prev.map(p => p.uid === userId ? { ...p, isSpeaking: isCurrentlySpeaking } : p)
            });

            // Keep "isSpeaking" true for a short duration after speech stops
            if (!isCurrentlySpeaking && Date.now() - lastSpokeTime < 300) {
                 setParticipants(prev => {
                     const participant = prev.find(p => p.uid === userId);
                     if (participant?.isSpeaking) {
                         return prev.map(p => p.uid === userId ? { ...p, isSpeaking: true } : p)
                     }
                     return prev;
                 });
            }
        };

        if (speakingDetectionIntervals.current[userId]) clearInterval(speakingDetectionIntervals.current[userId]);
        speakingDetectionIntervals.current[userId] = setInterval(checkSpeaking, 200);

        return () => {
            if(speakingDetectionIntervals.current[userId]) clearInterval(speakingDetectionIntervals.current[userId]);
            delete speakingDetectionIntervals.current[userId];
            source.disconnect();
        };

    }, []);
    
    const createPeerConnection = useCallback((otherUserId: string): RTCPeerConnection => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        
        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(otherUserId, 'ice-candidate', event.candidate.toJSON());
            }
        };
        
        pc.ontrack = event => {
            const stream = event.streams[0];
            if (!stream) return;
            if (event.track.kind === 'audio') {
                setRemoteAudioStreams(p => ({ ...p, [otherUserId]: stream }));
                setupSpeakingDetection(stream, otherUserId);
            } else if (event.track.kind === 'video') {
                 setRemoteVideoStreams(p => ({ ...p, [otherUserId]: stream }));
            }
        };

        if (localStream) {
            localStream.getTracks().forEach(track => {
                try {
                   pc.addTrack(track, localStream);
                } catch (e) {
                    console.error("Error adding local track:", e);
                }
            });
        }
        
        return pc;
    }, [localStream, sendSignal, setupSpeakingDetection]);

    const joinVoice = useCallback(async (options?: { muted: boolean }) => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
                video: { facingMode }
            });
            
            stream.getVideoTracks().forEach(track => track.enabled = false);
            if (stream.getAudioTracks()[0]) {
                stream.getAudioTracks()[0].enabled = !options?.muted;
            }
            
            setLocalStream(stream);
            setupSpeakingDetection(stream, user.uid);
            
            await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName || 'Biri', photoURL: user.photoURL }, { initialMuteState: options?.muted ?? false });

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            await _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState, facingMode, setupSpeakingDetection]);
    
    const leaveVoice = useCallback(async () => {
        if (!user || !activeRoomId) return;
        if(isConnected) {
           await leaveVoiceAction(activeRoomId, user.uid);
        }
        await _cleanupAndResetState();
    }, [user, activeRoomId, isConnected, _cleanupAndResetState]);

    const handleLeaveRoom = useCallback(async () => {
        if (!user || !activeRoomId) return;
        const currentRoomId = activeRoomId;
        setActiveRoomId(null);
        if(isConnected) {
            await leaveVoiceAction(currentRoomId, user.uid);
        }
        await leaveRoom(currentRoomId, user.uid, user.displayName || 'Biri');
        await _cleanupAndResetState();
        router.push('/rooms');
    }, [user, activeRoomId, isConnected, _cleanupAndResetState, router]);

    const stopScreenShare = useCallback(async () => {
        // This functionality is currently disabled from the UI, but logic is kept for future use.
    }, []);

    const startScreenShare = useCallback(async () => {
         // This functionality is currently disabled from the UI, but logic is kept for future use.
    }, []);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
            if (!newMutedState && user) {
                updateLastActive(activeRoomId, user.uid);
                lastActiveUpdateTimestamp.current = Date.now();
            }
        }
    }, [self, activeRoomId, localStream, user]);

    const stopVideo = useCallback(async () => {
        if (!self || !activeRoomId || !localStream || !isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = false;
            setIsSharingVideo(false);
            await toggleVideoAction(activeRoomId, self.uid, false);
        }
    }, [self, activeRoomId, localStream, isSharingVideo]);
    
    const startVideo = useCallback(async () => {
        if (!self || !activeRoomId || !localStream || isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = true;
            setIsSharingVideo(true);
            await toggleVideoAction(activeRoomId, self.uid, true);
        }
    }, [self, activeRoomId, localStream, isSharingVideo]);

    const switchCamera = useCallback(async () => {
        if (!isConnected || !localStream || !isSharingVideo) return;
        
        const oldTrack = localStream.getVideoTracks()[0];
        if (oldTrack) {
            oldTrack.stop();
            localStream.removeTrack(oldTrack);
        }

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        
        try {
            const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
            const newVideoTrack = newVideoStream.getVideoTracks()[0];
            if (!newVideoTrack) throw new Error("Yeni kamera akışı alınamadı.");

            localStream.addTrack(newVideoTrack);

            for (const peerId in peerConnections.current) {
                const sender = peerConnections.current[peerId].getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    await sender.replaceTrack(newVideoTrack);
                }
            }
            
            setFacingMode(newFacingMode);
        } catch (error) {
            console.error("Error switching camera:", error);
            toast({ variant: 'destructive', title: 'Kamera Değiştirilemedi', description: 'Arka kamera bulunamadı veya bir hata oluştu. Lütfen tekrar deneyin.' });
            await stopVideo();
        }
    }, [isConnected, localStream, isSharingVideo, facingMode, toast, stopVideo]);


    const addTrackToPlaylist = useCallback(async (data: { fileName: string, fileDataUrl: string }) => {
        if (!user || !activeRoomId || !userData) throw new Error("Gerekli bilgi eksik.");
        await addTrackAction({
            roomId: activeRoomId,
            fileName: data.fileName,
            fileDataUrl: data.fileDataUrl,
        }, { 
            uid: user.uid, 
            username: userData.username 
        });
    }, [user, activeRoomId, userData]);

    const removeTrackFromPlaylist = useCallback(async (trackId: string) => {
        if (!user || !activeRoomId) return;
        try {
            await removeTrackAction(activeRoomId, trackId, user.uid);
        } catch(e: any) {
             toast({ variant: 'destructive', description: e.message });
        }
    }, [user, activeRoomId, toast]);

    const togglePlayback = useCallback(async () => {
        if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return;
        try {
            await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' });
        } catch (e: any) {
            toast({ variant: 'destructive', description: e.message });
        }
    }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);

    const skipTrack = useCallback(async (direction: 'next' | 'previous') => {
        if (!user || !activeRoomId || !isCurrentUserDj) return;
        try {
            await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction });
        } catch(e: any) {
            toast({ variant: 'destructive', description: e.message });
        }
    }, [user, activeRoomId, isCurrentUserDj, toast]);

    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);

    useEffect(() => {
        if (!user || !activeRoomId) {
            setActiveRoom(null);
            setParticipants([]);
            setLivePlaylist([]);
            if(isConnected) {
                _cleanupAndResetState();
            }
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), docSnap => {
            if (docSnap.exists()) {
                 setActiveRoom({id: docSnap.id, ...docSnap.data()} as Room)
            } else {
                 if(pathname.startsWith('/rooms/')) {
                    toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                    router.push('/rooms');
                 }
                 setActiveRoomId(null); // This will trigger the cleanup effect
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => {
                const data = d.data() as VoiceParticipant;
                // Add a default isSpeaking property if it doesn't exist
                return { isSpeaking: false, ...data };
            });
            setParticipants(fetched);
            if (isConnected && user && !fetched.some(p => p.uid === user.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                _cleanupAndResetState();
            }
        });

        const playlistUnsub = onSnapshot(query(collection(db, "rooms", activeRoomId, "playlist"), orderBy('order')), snapshot => {
            const tracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistTrack));
            setLivePlaylist(tracks);
        });

        return () => { roomUnsub(); participantsUnsub(); playlistUnsub(); };
    }, [user, activeRoomId, pathname, router, toast, isConnected, _cleanupAndResetState]);
    
    // Manage peer connections based on participant list
    useEffect(() => {
        if (!user || !isConnected) return;

        const myId = user.uid;
        const currentPeerIds = new Set(Object.keys(peerConnections.current));

        participants.forEach(p => {
            if (p.uid === myId) return;

            if (currentPeerIds.has(p.uid)) {
                currentPeerIds.delete(p.uid);
            } else {
                // New participant, I am the initiator
                const pc = createPeerConnection(p.uid);
                peerConnections.current[p.uid] = pc;
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => sendSignal(p.uid, 'offer', pc.localDescription!.toJSON()))
                    .catch(e => console.error(`Error creating offer for ${p.uid}:`, e));
            }
        });

        // Close connections for participants who have left
        currentPeerIds.forEach(peerId => {
            peerConnections.current[peerId]?.close();
            delete peerConnections.current[peerId];
            setRemoteAudioStreams(prev => { const newState = { ...prev }; delete newState[peerId]; return newState; });
            setRemoteVideoStreams(prev => { const newState = { ...prev }; delete newState[peerId]; return newState; });
        });

    }, [participants, user, isConnected, createPeerConnection, sendSignal]);

    // Signal listener effect
    useEffect(() => {
        if (!user || !activeRoomId) return;

        const q = query(collection(db, `rooms/${activeRoomId}/signals`), where('to', '==', user.uid), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const from = signal.from;
                    let pc = peerConnections.current[from];

                    if (!pc && isConnected) {
                        pc = createPeerConnection(from);
                        peerConnections.current[from] = pc;
                    }
                    if (!pc) continue;
                    
                    try {
                        if (signal.type === 'offer') {
                            await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                            const answer = await pc.createAnswer();
                            await pc.setLocalDescription(answer);
                            await sendSignal(from, 'answer', pc.localDescription!.toJSON());

                            // Process any queued ICE candidates for this peer
                            if (iceCandidateQueue.current[from]) {
                                iceCandidateQueue.current[from].forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)));
                                delete iceCandidateQueue.current[from];
                            }
                        } else if (signal.type === 'answer') {
                           if (pc.signalingState === "have-local-offer") {
                                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                           }
                        } else if (signal.type === 'ice-candidate') {
                           if (pc.remoteDescription) {
                                await pc.addIceCandidate(new RTCIceCandidate(signal.data));
                           } else {
                               if (!iceCandidateQueue.current[from]) {
                                   iceCandidateQueue.current[from] = [];
                               }
                               iceCandidateQueue.current[from].push(signal.data);
                           }
                        }
                    } catch (error) {
                         console.error(`Error handling signal type ${signal.type} from ${from}:`, error);
                    }
                    await deleteDoc(change.doc.ref);
                }
            }
        });
        
        return () => unsubscribe();
    }, [user, activeRoomId, sendSignal, createPeerConnection, isConnected]);


    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, remoteAudioStreams, remoteScreenStreams, remoteVideoStreams, localStream, isSharingScreen, isSharingVideo,
        setActiveRoomId, joinVoice, leaveRoom: handleLeaveRoom, leaveVoice, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom, startScreenShare, stopScreenShare, startVideo, stopVideo, switchCamera,
        livePlaylist, currentTrack, isCurrentUserDj, isDjActive,
        addTrackToPlaylist, removeTrackFromPlaylist, togglePlayback, skipTrack
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
