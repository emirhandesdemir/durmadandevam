// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction, updateLastActive } from '@/lib/actions/voiceActions';
import { leaveRoom as leaveRoomAction, addTrackToPlaylist as addTrackAction, removeTrackFromPlaylist as removeTrackAction, controlPlayback as controlPlaybackAction } from '@/lib/actions/roomActions';
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
    // Music Player
    livePlaylist: PlaylistTrack[];
    currentTrack: (PlaylistTrack & { isPlaying: boolean }) | null;
    isCurrentUserDj: boolean;
    isDjActive: boolean;
    isMusicLoading: boolean;
    addTrackToPlaylist: (file: File) => Promise<void>;
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

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});
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
    const [isMusicLoading, setIsMusicLoading] = useState(false);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const videoSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const audioAnalysers = useRef<Record<string, { analyser: AnalyserNode, dataArray: Uint8Array, context: AudioContext }>>({});
    const animationFrameId = useRef<number>();
    const lastActiveUpdateTimestamp = useRef<number>(0);

    // Music Refs
    const musicAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null);
    const mixedStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const musicGainNodeRef = useRef<GainNode | null>(null);

    const self = useMemo(() => participants.find(p => p.uid === user?.uid) || null, [participants, user?.uid]);
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
        // Stop music playback logic
        if (musicAudioRef.current) {
            musicAudioRef.current.pause();
            if (musicAudioRef.current.src) URL.revokeObjectURL(musicAudioRef.current.src);
            musicAudioRef.current = null;
        }
        if (audioContextRef.current) {
            await audioContextRef.current.close().catch(e => console.error("Error closing audio context:", e));
            audioContextRef.current = null;
        }
        musicGainNodeRef.current = null;
        mixedStreamDestinationRef.current = null;
        originalMicTrackRef.current = null;

        // Close peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        // Stop local streams
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);
        setIsSharingVideo(false);

        // Cleanup audio analysis
        Object.values(audioAnalysers.current).forEach(({ context }) => context.close());
        audioAnalysers.current = {};
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

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
    
    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream || peerConnections.current[otherUid]) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = e => {
            if (e.track.kind === 'audio') {
                 setRemoteAudioStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
            } else if (e.track.kind === 'video') {
                 setRemoteVideoStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
            }
        };
        pc.onicecandidate = e => e.candidate && sendSignal(otherUid, 'ice-candidate', e.candidate.toJSON());
        
        if (user.uid > otherUid) {
             pc.onnegotiationneeded = async () => { 
                try { 
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendSignal(otherUid, 'offer', pc.localDescription!.toJSON()); 
                } catch (e) { console.error("Nego error:", e); } 
            };
        }
        return pc;
    }, [user, localStream, sendSignal]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from] || createPeerConnection(from);
        if (!pc || !data) return;
        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(from, 'answer', pc.localDescription!.toJSON());
            } else if (type === 'answer') {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
            } else if (type === 'ice-candidate' && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            }
        } catch (error) { console.error("Signal handling error:", type, error); }
    }, [createPeerConnection, sendSignal]);

    useEffect(() => {
        if (!user || !activeRoomId) {
            setActiveRoom(null);
            setParticipants([]);
            setLivePlaylist([]);
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

        const playlistUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "playlist"), snapshot => {
            const tracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistTrack)).sort((a,b) => a.order - b.order);
            setLivePlaylist(tracks);
        });

        return () => { roomUnsub(); participantsUnsub(); playlistUnsub(); };
    }, [user, activeRoomId, pathname, router, toast, isConnected, _cleanupAndResetState]);
    
    // WebRTC signaling and peer connection management
    useEffect(() => {
        if (!isConnected || !user) return () => {};

        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${connectedRoomId}/signals`), where('to', '==', user.uid)), s => {
             s.docChanges().forEach(async c => {
                if (c.type === 'added') {
                    await handleSignal(c.doc.data().from, c.doc.data().type, c.doc.data().data);
                    await deleteDoc(c.doc.ref);
                }
             })
        });
        
        const otherP = participants.filter(p => p.uid !== user.uid);
        otherP.forEach(p => createPeerConnection(p.uid));
        
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherP.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteScreenStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteVideoStreams(p => { const s = {...p}; delete s[uid]; return s; });
            }
        });
        
        return () => signalsUnsub();
    }, [participants, isConnected, user, connectedRoomId, handleSignal, createPeerConnection]);
    
    const joinRoom = useCallback(async (options?: { muted: boolean }) => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
                video: { facingMode }
            });
            stream.getVideoTracks()[0].enabled = false;
            // Join with mic ON by default
            if (stream.getAudioTracks()[0]) {
                stream.getAudioTracks()[0].enabled = true;
            }
            
            setLocalStream(stream);
            
            const result = await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL }, { initialMuteState: false });
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

    const leaveRoom = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoice(connectedRoomId, user.uid);
        await leaveRoomAction(connectedRoomId, user.uid, user.displayName || 'Biri');
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
        if (!user || !connectedRoomId || isSharingScreen) return;

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
    }, [user, connectedRoomId, isSharingScreen, stopScreenShare, toast]);

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
        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        try {
            const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
            const newVideoTrack = newVideoStream.getVideoTracks()[0];
            if (!newVideoTrack) throw new Error("Yeni kamera akışı alınamadı.");
            const oldTrack = localStream.getVideoTracks()[0];
            localStream.removeTrack(oldTrack);
            oldTrack.stop();
            localStream.addTrack(newVideoTrack);
            for (const peerId in peerConnections.current) {
                const sender = peerConnections.current[peerId].getSenders().find(s => s.track?.kind === 'video');
                if (sender) await sender.replaceTrack(newVideoTrack);
            }
            setFacingMode(newFacingMode);
        } catch (error) {
            console.error("Error switching camera:", error);
            toast({ variant: 'destructive', title: 'Kamera Değiştirilemedi', description: 'Arka kamera bulunamadı veya bir hata oluştu.' });
            await stopVideo();
        }
    }, [isConnected, localStream, isSharingVideo, facingMode, toast, stopVideo]);

    // --- MUSIC PLAYER ACTIONS ---
    const addTrackToPlaylist = useCallback(async (file: File) => {
        if (!user || !activeRoomId || !userData) return;
        setIsMusicLoading(true);
        try {
            await addTrackAction(activeRoomId, file, { uid: user.uid, username: userData.username });
        } catch (e: any) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsMusicLoading(false);
        }
    }, [user, activeRoomId, userData, toast]);

    const removeTrackFromPlaylist = useCallback(async (trackId: string) => {
        if (!user || !activeRoomId) return;
        setIsMusicLoading(true);
        try {
            await removeTrackAction(activeRoomId, trackId, user.uid);
        } catch(e: any) {
             toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsMusicLoading(false);
        }
    }, [user, activeRoomId, toast]);

    const togglePlayback = useCallback(async () => {
        if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return;
        setIsMusicLoading(true);
        try {
            await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' });
        } catch (e: any) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsMusicLoading(false);
        }
    }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);

    const skipTrack = useCallback(async (direction: 'next' | 'previous') => {
        if (!user || !activeRoomId || !isCurrentUserDj) return;
        setIsMusicLoading(true);
        try {
            await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction });
        } catch(e: any) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsMusicLoading(false);
        }
    }, [user, activeRoomId, isCurrentUserDj, toast]);

    const memoizedParticipants = useMemo(() => {
        return participants.map(p => ({ ...p, isSpeaker: !!speakingStates[p.uid] }));
    }, [participants, speakingStates]);
    
    const value = {
        activeRoom, participants: memoizedParticipants, self, isConnecting, isConnected, remoteAudioStreams, remoteScreenStreams, remoteVideoStreams, localStream, isSharingScreen, isSharingVideo,
        setActiveRoomId, joinRoom, leaveRoom, leaveVoiceOnly, toggleSelfMute, startScreenShare, stopScreenShare, startVideo, stopVideo, switchCamera,
        // Music Player values
        livePlaylist, currentTrack, isCurrentUserDj, isDjActive, isMusicLoading,
        addTrackToPlaylist, removeTrackFromPlaylist, togglePlayback, skipTrack
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
