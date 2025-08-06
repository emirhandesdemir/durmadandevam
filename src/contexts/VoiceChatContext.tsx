// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, deleteDoc, addDoc, getDoc, updateDoc, Timestamp, WriteBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice as leaveVoiceAction, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction } from '@/lib/actions/voiceActions';
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
    
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
    const audioContextRef = useRef<AudioContext | null>(null);
    const speakingDetectionIntervals = useRef<Record<string, NodeJS.Timeout>>({});


    const self = participants.find(p => p.uid === user?.uid);
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;
    const isCurrentUserDj = isConnected && !!activeRoom?.djUid && activeRoom.djUid === user?.uid;
    const isDjActive = !!activeRoom?.djUid;
    
    const currentTrack = livePlaylist && activeRoom?.currentTrackIndex !== undefined && activeRoom.currentTrackIndex >= 0 
        ? { ...livePlaylist[activeRoom.currentTrackIndex], isPlaying: !!activeRoom.isMusicPlaying } 
        : null;

    const _cleanupAndResetState = useCallback(() => {
        console.log("Cleanup: Closing all peer connections and stopping streams.");
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
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }

        setRemoteAudioStreams({});
        setRemoteVideoStreams({});
        iceCandidateQueue.current = {};
        setIsConnecting(false);
    }, [localStream, localScreenStream]);

    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoomId, user]);

     const setupSpeakingDetection = useCallback((stream: MediaStream, userId: string) => {
        if (typeof window.AudioContext === 'undefined' || !stream.getAudioTracks().length) return;
        
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
        
        const checkSpeaking = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = dataArray.reduce((acc, val) => acc + val * val, 0);
            const volume = Math.sqrt(sum / dataArray.length);
            const isCurrentlySpeaking = volume > 15;

            setParticipants(prev => {
                const participant = prev.find(p => p.uid === userId);
                if (participant && participant.isSpeaking !== isCurrentlySpeaking) {
                     return prev.map(p => p.uid === userId ? { ...p, isSpeaking: isCurrentlySpeaking } : p)
                }
                return prev;
            });
        };

        if (speakingDetectionIntervals.current[userId]) clearInterval(speakingDetectionIntervals.current[userId]);
        speakingDetectionIntervals.current[userId] = setInterval(checkSpeaking, 200);
    }, []);

    const createPeerConnection = useCallback((otherUserId: string): RTCPeerConnection => {
        if (peerConnections.current[otherUserId]) {
            return peerConnections.current[otherUserId];
        }

        console.log(`Creating new peer connection to ${otherUserId}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        
        pc.onicecandidate = event => {
            if (event.candidate) sendSignal(otherUserId, 'ice-candidate', event.candidate.toJSON());
        };
        
        pc.ontrack = event => {
            const stream = event.streams[0];
            if (!stream) return;
            console.log(`Received track of kind ${event.track.kind} from ${otherUserId}`);
            if (event.track.kind === 'audio') {
                setRemoteAudioStreams(p => ({ ...p, [otherUserId]: stream }));
                setupSpeakingDetection(stream, otherUserId);
            } else if (event.track.kind === 'video') {
                setRemoteVideoStreams(p => ({ ...p, [otherUserId]: stream }));
            }
        };

        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        peerConnections.current[otherUserId] = pc;
        return pc;
    }, [localStream, sendSignal, setupSpeakingDetection]);

    const joinVoice = useCallback(async (options?: { muted: boolean }) => {
        if (!user || !userData || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        console.log("Joining voice...");

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
                video: false,
            });
            stream.getAudioTracks()[0].enabled = !(options?.muted ?? false);
            setLocalStream(stream);
            setupSpeakingDetection(stream, user.uid);

            await joinVoiceChat(activeRoomId, {
                uid: user.uid,
                displayName: userData.username,
                photoURL: userData.photoURL
            }, { initialMuteState: options?.muted ?? false });

            // The participant listener will handle creating connections.
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: "Mikrofon erişimi reddedildi veya bir hata oluştu." });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, userData, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState, setupSpeakingDetection]);

    const leaveVoice = useCallback(async () => {
        if (!user || !activeRoomId) return;
        if(isConnected) await leaveVoiceAction(activeRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, activeRoomId, isConnected, _cleanupAndResetState]);
    
    const handleLeaveRoom = useCallback(async () => {
        if (!user || !activeRoomId) return;
        const currentRoomId = activeRoomId;
        setActiveRoomId(null);
        await leaveRoom(currentRoomId, user.uid, user.displayName || 'Biri');
        _cleanupAndResetState();
        router.push('/rooms');
    }, [user, activeRoomId, _cleanupAndResetState, router]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
        }
    }, [self, activeRoomId, localStream]);
    
    // Placeholder functions for video/screenshare
    const stopVideo = useCallback(async () => {}, []);
    const startVideo = useCallback(async () => {}, []);
    const switchCamera = useCallback(async () => {}, []);
    const stopScreenShare = useCallback(async () => {}, []);
    const startScreenShare = useCallback(async () => {}, []);
    
    const addTrackToPlaylist = useCallback(async (data: { fileName: string, fileDataUrl: string }) => {
        if (!user || !activeRoomId || !userData) throw new Error("Gerekli bilgi eksik.");
        await addTrackAction({ roomId: activeRoomId, fileName: data.fileName, fileDataUrl: data.fileDataUrl }, { uid: user.uid, username: userData.username });
    }, [user, activeRoomId, userData]);

    const removeTrackFromPlaylist = useCallback(async (trackId: string) => {
        if (!user || !activeRoomId) return;
        await removeTrackAction(activeRoomId, trackId, user.uid).catch(e => toast({ variant: 'destructive', description: e.message }));
    }, [user, activeRoomId, toast]);

    const togglePlayback = useCallback(async () => {
        if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return;
        await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' }).catch(e => toast({ variant: 'destructive', description: e.message }));
    }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);

    const skipTrack = useCallback(async (direction: 'next' | 'previous') => {
        if (!user || !activeRoomId || !isCurrentUserDj) return;
        await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction }).catch(e => toast({ variant: 'destructive', description: e.message }));
    }, [user, activeRoomId, isCurrentUserDj, toast]);

    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);

    // Main useEffect for managing subscriptions and WebRTC connections
    useEffect(() => {
        const currentId = activeRoomId;
        if (!user || !currentId) {
            _cleanupAndResetState();
            setActiveRoom(null);
            setParticipants([]);
            setLivePlaylist([]);
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", currentId), docSnap => {
            if (docSnap.exists()) setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            else {
                if (pathname.startsWith('/rooms/')) {
                    toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                    router.push('/rooms');
                }
                setActiveRoomId(null);
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", currentId, "voiceParticipants"), snapshot => {
            const newParticipants = snapshot.docs.map(d => ({ isSpeaking: false, ...d.data() } as VoiceParticipant));
            setParticipants(prev => {
                 // Preserve speaking state of existing participants
                 return newParticipants.map(p => ({
                    ...p,
                    isSpeaking: prev.find(oldP => oldP.uid === p.uid)?.isSpeaking || false
                 }));
            });
        });

        const playlistUnsub = onSnapshot(query(collection(db, "rooms", currentId, "playlist"), orderBy('order')), snapshot => {
            setLivePlaylist(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistTrack)));
        });

        const signalUnsub = onSnapshot(query(collection(db, `rooms/${currentId}/signals`), where('to', '==', user.uid)), async snapshot => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const from = signal.from;
                    let pc = peerConnections.current[from];
                    if (!pc) pc = createPeerConnection(from);

                    if (signal.type === 'offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await sendSignal(from, 'answer', pc.localDescription!.toJSON());

                        if (iceCandidateQueue.current[from]) {
                            iceCandidateQueue.current[from].forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)));
                            delete iceCandidateQueue.current[from];
                        }
                    } else if (signal.type === 'answer' && pc.signalingState !== 'stable') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                    } else if (signal.type === 'ice-candidate') {
                       if (pc?.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(signal.data));
                       else {
                           if (!iceCandidateQueue.current[from]) iceCandidateQueue.current[from] = [];
                           iceCandidateQueue.current[from].push(signal.data);
                       }
                    }
                    await deleteDoc(change.doc.ref);
                }
            }
        });

        return () => { roomUnsub(); participantsUnsub(); playlistUnsub(); signalUnsub(); _cleanupAndResetState(); };
    }, [user, activeRoomId, pathname, router, toast, _cleanupAndResetState, createPeerConnection, sendSignal]);

    // Effect to establish connections when participants change
    useEffect(() => {
        if (!isConnected || !user) return;
        const myId = user.uid;

        participants.forEach(p => {
            if (p.uid === myId || peerConnections.current[p.uid]) return;
            console.log(`New participant ${p.username} found. Initiating connection.`);
            const pc = createPeerConnection(p.uid);
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => sendSignal(p.uid, 'offer', pc.localDescription!.toJSON()))
                .catch(e => console.error(`Offer creation failed for ${p.uid}:`, e));
        });

        Object.keys(peerConnections.current).forEach(peerId => {
            if (!participants.some(p => p.uid === peerId)) {
                console.log(`Participant ${peerId} left. Cleaning up connection.`);
                peerConnections.current[peerId]?.close();
                delete peerConnections.current[peerId];
                setRemoteAudioStreams(p => { const n = { ...p }; delete n[peerId]; return n; });
                setRemoteVideoStreams(p => { const n = { ...p }; delete n[peerId]; return n; });
            }
        });

    }, [participants, isConnected, user, createPeerConnection, sendSignal]);


    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, remoteAudioStreams, remoteVideoStreams, localStream, isSharingScreen, isSharingVideo,
        setActiveRoomId, joinVoice, leaveRoom: handleLeaveRoom, leaveVoice, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom, startScreenShare, stopScreenShare, startVideo, stopVideo, switchCamera,
        livePlaylist, currentTrack, isCurrentUserDj, isDjActive,
        addTrackToPlaylist, removeTrackFromPlaylist, togglePlayback, skipTrack
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat must be used within a VoiceChatProvider');
    return context;
};
