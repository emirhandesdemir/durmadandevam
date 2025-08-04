// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, deleteDoc, addDoc, getDoc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction, updateLastActive } from '@/lib/actions/voiceActions';
import { leaveRoom, addTrackToPlaylist as addTrackAction, removeTrackFromPlaylist as removeTrackAction, controlPlayback as controlPlaybackAction } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
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
    joinRoom: (options?: { muted: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    leaveVoiceOnly: () => Promise<void>;
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
    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);
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
    
    // Music Player State (Live)
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const videoSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const lastActiveUpdateTimestamp = useRef<number>(0);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);

    const self = useMemo(() => participants.find(p => p.uid === user?.uid), [participants, user?.uid]);
    const isConnected = !!self && !!connectedRoomId;
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
        // Close peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        // Stop local streams
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);
        setIsSharingVideo(false);

        if(audioWorkletNodeRef.current) {
            audioWorkletNodeRef.current.disconnect();
            audioWorkletNodeRef.current = null;
        }
        if(audioContextRef.current && audioContextRef.current.state !== 'closed') {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        // Reset state
        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        setRemoteVideoStreams({});
        screenSenderRef.current = {};
        videoSenderRef.current = {};
        setConnectedRoomId(null);
        setIsConnecting(false);
    }, [localStream, localScreenStream]);
    
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!connectedRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${connectedRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [connectedRoomId, user]);
    
    const joinRoom = useCallback(async (options?: { muted: boolean }) => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
                video: { facingMode }
            });
            if (stream.getVideoTracks()[0]) {
              stream.getVideoTracks()[0].enabled = false;
            }
            if (stream.getAudioTracks()[0]) {
                stream.getAudioTracks()[0].enabled = !options?.muted;
            }
            
            setLocalStream(stream);
            
            const result = await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName || 'Biri', photoURL: user.photoURL }, { initialMuteState: options?.muted ?? false });
            if (!result.success) {
                throw new Error(result.error || 'Sesli sohbete katılamadınız.');
            }
            setConnectedRoomId(activeRoomId);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState, facingMode]);
    
    const leaveVoiceOnly = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoice(connectedRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, connectedRoomId, _cleanupAndResetState]);

    const handleLeaveRoom = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoice(connectedRoomId, user.uid);
        await leaveRoom(connectedRoomId, user.uid, user.displayName || 'Biri');
        _cleanupAndResetState();
        router.push('/rooms');
    }, [user, connectedRoomId, _cleanupAndResetState, router]);

    const stopScreenShare = useCallback(async () => {
        if (!user || !connectedRoomId || !localScreenStream) return;
        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
        for (const peerId in peerConnections.current) {
            const sender = screenSenderRef.current[peerId];
            if (sender) {
                peerConnections.current[peerId].removeTrack(sender);
                delete screenSenderRef.current[peerId];
            }
        }
        await toggleScreenShareAction(connectedRoomId, user.uid, false);
    }, [user, connectedRoomId, localScreenStream]);

    const startScreenShare = useCallback(async () => {
        if (!user || !connectedRoomId || isSharingScreen || !localStream) return;

        try {
            if (!navigator?.mediaDevices?.getDisplayMedia) {
                throw new Error('Tarayıcınız bu özelliği desteklemiyor gibi görünüyor.');
            }
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as MediaTrackConstraints, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error("No screen track found");

            screenTrack.onended = () => stopScreenShare();
            setLocalScreenStream(screenStream);
            
            for (const peerId in peerConnections.current) {
                screenSenderRef.current[peerId] = peerConnections.current[peerId].addTrack(screenTrack, screenStream);
            }
            await toggleScreenShareAction(connectedRoomId, user.uid, true);
        } catch (error: any) {
             console.error("Screen share error:", error);
             let description = 'Ekran paylaşımı başlatılamadı.';
             if (error.name === 'NotAllowedError') {
                 description = 'Ekran paylaşımı için izin vermeniz gerekiyor. Lütfen tekrar deneyin ve tarayıcı istemine izin verin.';
             } else {
                description = `Bu özellik güncel bir tarayıcı ve güvenli (HTTPS) bir bağlantı gerektirebilir. Hata: ${error.message}`;
             }
            toast({ 
                variant: 'destructive', 
                title: 'Hata', 
                description: description
            });
        }
    }, [user, connectedRoomId, isSharingScreen, stopScreenShare, toast, localStream]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(connectedRoomId, self.uid, newMutedState);
            if (!newMutedState && user) {
                updateLastActive(connectedRoomId, user.uid);
                lastActiveUpdateTimestamp.current = Date.now();
            }
        }
    }, [self, connectedRoomId, localStream, user]);

    const stopVideo = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream || !isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = false;
            setIsSharingVideo(false);
            await toggleVideoAction(connectedRoomId, self.uid, false);
        }
    }, [self, connectedRoomId, localStream, isSharingVideo]);
    
    const startVideo = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream || isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = true;
            setIsSharingVideo(true);
            await toggleVideoAction(connectedRoomId, self.uid, true);
        }
    }, [self, connectedRoomId, localStream, isSharingVideo]);

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


    // Music Player Actions
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

    // UI state management
    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);

    // Firestore listeners
    useEffect(() => {
        if (!user || !activeRoomId) {
            setActiveRoom(null);
            setParticipants([]);
            setLivePlaylist([]);
            // If user is not in a room, ensure no voice connection persists
            if(connectedRoomId) {
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
                 setActiveRoom(null);
                 setParticipants([]);
                 _cleanupAndResetState(); // Clean up if room is deleted
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
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
    
    // Disconnect from voice when navigating away to a different room
    useEffect(() => {
        if (activeRoomId && connectedRoomId && activeRoomId !== connectedRoomId) {
            leaveVoiceOnly();
        }
    }, [activeRoomId, connectedRoomId, leaveVoiceOnly]);
    
    // Main WebRTC connection management logic
    useEffect(() => {
        if (!isConnected || !user || !localStream) return;

        // Clean up connections for users who have left
        const currentPeerIds = Object.keys(peerConnections.current);
        const participantIds = participants.map(p => p.uid);
        const leftParticipantIds = currentPeerIds.filter(id => !participantIds.includes(id));

        leftParticipantIds.forEach(id => {
            peerConnections.current[id]?.close();
            delete peerConnections.current[id];
            setRemoteAudioStreams(p => { const s = {...p}; delete s[id]; return s; });
            setRemoteVideoStreams(p => { const s = {...p}; delete s[id]; return s; });
        });

        // Create connections for new users
        const newParticipants = participants.filter(p => p.uid !== user.uid && !peerConnections.current[p.uid]);

        for (const otherUser of newParticipants) {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnections.current[otherUser.uid] = pc;

            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

            pc.onicecandidate = event => {
                if (event.candidate) {
                    sendSignal(otherUser.uid, 'ice-candidate', event.candidate.toJSON());
                }
            };
            
            pc.ontrack = event => {
                if (event.track.kind === 'audio') {
                    setRemoteAudioStreams(p => ({ ...p, [otherUser.uid]: event.streams[0] }));
                } else if (event.track.kind === 'video') {
                    setRemoteVideoStreams(p => ({ ...p, [otherUser.uid]: event.streams[0] }));
                }
            };
        }
    }, [isConnected, user, localStream, participants, sendSignal]);

     // Signaling listener
    useEffect(() => {
        if (!isConnected || !user || !connectedRoomId) return;

        const q = query(collection(db, `rooms/${connectedRoomId}/signals`), where('to', '==', user.uid));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const from = signal.from;
                    const pc = peerConnections.current[from];

                    if (pc) {
                        try {
                            if (signal.type === 'offer') {
                                await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                                const answer = await pc.createAnswer();
                                await pc.setLocalDescription(answer);
                                await sendSignal(from, 'answer', pc.localDescription!.toJSON());
                            } else if (signal.type === 'answer') {
                                if (pc.signalingState === 'have-local-offer') {
                                     await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                                }
                            } else if (signal.type === 'ice-candidate') {
                                if (pc.remoteDescription) {
                                    await pc.addIceCandidate(new RTCIceCandidate(signal.data));
                                }
                            }
                        } catch (error) {
                             console.error(`Error handling signal type ${signal.type} from ${from}:`, error);
                        }
                    }
                    await deleteDoc(change.doc.ref);
                }
            }
        });

        // Send offers to new peers
        const newParticipants = participants.filter(p => p.uid !== user.uid && peerConnections.current[p.uid]?.signalingState === 'stable');
        for (const otherUser of newParticipants) {
            const pc = peerConnections.current[otherUser.uid];
            if(pc && user.uid > otherUser.uid) { // Simple polite peer logic
                pc.createOffer()
                    .then(offer => pc.setLocalDescription(offer))
                    .then(() => sendSignal(otherUser.uid, 'offer', pc.localDescription!.toJSON()))
                    .catch(e => console.error("Re-negotiation offer failed", e));
            }
        }
        
        return () => unsubscribe();
    }, [isConnected, user, connectedRoomId, participants, sendSignal]);

    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, remoteAudioStreams, remoteScreenStreams, remoteVideoStreams, localStream, isSharingScreen, isSharingVideo,
        setActiveRoomId, joinRoom, leaveRoom: handleLeaveRoom, leaveVoiceOnly, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom, startScreenShare, stopScreenShare, startVideo, stopVideo, switchCamera,
        // Music Player values
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
