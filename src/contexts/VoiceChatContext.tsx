// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, addDoc, deleteDoc, getDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, setDoc, limit, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice, toggleSelfMute as toggleMuteAction, updateVideoStatus, updateLastActive } from '@/lib/actions/voiceActions';
import { leaveRoom as leaveRoomAction, addTrackToPlaylist as addTrackAction, removeTrackFromPlaylist as removeTrackAction, controlPlayback as controlPlaybackAction } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';
import io, { Socket } from 'socket.io-client';


const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ],
};

type PeerConnectionStatus = 'new' | 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean;
    isMinimized: boolean;
    isSpeakerMuted: boolean;
    localStream: MediaStream | null;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteVideoStreams: Record<string, MediaStream>;
    isSharingScreen: boolean;
    isSharingVideo: boolean;
    localScreenStream: MediaStream | null;
    micPermission: PermissionState | null;
    camPermission: PermissionState | null;
    connectionState: RTCPeerConnectionState;
    sessionDuration: number;
    micGain: number;
    setMicGain: React.Dispatch<React.SetStateAction<number>>;
    speakerVolume: number;
    setSpeakerVolume: React.Dispatch<React.SetStateAction<number>>;
    setActiveRoomId: (id: string | null) => void;
    joinVoice: (options?: { muted?: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    leaveVoiceOnly: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    minimizeRoom: () => void;
    expandRoom: () => void;
    toggleSpeakerMute: () => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    startVideo: () => Promise<void>;
    stopVideo: () => Promise<void>;
    switchCamera: () => Promise<void>;
    // Music Player
    livePlaylist: PlaylistTrack[];
    currentTrack: (PlaylistTrack & { isPlaying: boolean }) | null;
    isCurrentUserDj: boolean;
    isDjActive: boolean;
    isMusicLoading: boolean;
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
    
    const [micPermission, setMicPermission] = useState<PermissionState | null>(null);
    const [camPermission, setCamPermission] = useState<PermissionState | null>(null);
    const [connectionState, setConnectionState] = useState<RTCPeerConnectionState>('new');
    
    const [sessionDuration, setSessionDuration] = useState(0);
    const [micGain, setMicGain] = useState(1);
    const [speakerVolume, setSpeakerVolume] = useState(1);

    // Music Player State
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    
    // RTC and Socket State
    const socketRef = useRef<Socket | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const sessionDurationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    
    const self = useMemo(() => participants.find(p => p.uid === user?.uid) || null, [participants, user?.uid]);
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

    // Check permissions
    useEffect(() => {
        const checkPermissions = async () => {
            if (navigator.permissions) {
                const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
                const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
                setMicPermission(mic.state);
                setCamPermission(cam.state);
                mic.onchange = () => setMicPermission(mic.state);
                cam.onchange = () => setCamPermission(cam.state);
            }
        };
        checkPermissions();
    }, []);
    
    const _cleanupPeerConnection = useCallback((uid: string) => {
        if (peerConnections.current[uid]) {
            peerConnections.current[uid].close();
            delete peerConnections.current[uid];
        }
         setRemoteAudioStreams(prev => {
            const newState = { ...prev };
            delete newState[uid];
            return newState;
        });
        setRemoteVideoStreams(prev => {
            const newState = { ...prev };
            delete newState[uid];
            return newState;
        });
    }, []);

    const _cleanupAndResetState = useCallback(() => {
        Object.keys(peerConnections.current).forEach(_cleanupPeerConnection);
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
        setIsSharingVideo(false);

        if (sessionDurationIntervalRef.current) clearInterval(sessionDurationIntervalRef.current);
        setSessionDuration(0);

        socketRef.current?.disconnect();
        socketRef.current = null;
        
        setIsConnecting(false);
    }, [localStream, localScreenStream, _cleanupPeerConnection]);

    const createPeerConnection = useCallback((otherUid: string) => {
        if (peerConnections.current[otherUid] || !user || otherUid === user.uid) {
             return;
        }
        
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        
        pc.onicecandidate = event => {
            if (event.candidate) {
                socketRef.current?.emit('signal', { to: otherUid, from: user.uid, type: 'ice-candidate', signal: event.candidate });
            }
        };

        pc.ontrack = event => {
            if (event.track.kind === 'audio') {
                 setRemoteAudioStreams(prev => ({ ...prev, [otherUid]: event.streams[0] }));
            } else if (event.track.kind === 'video') {
                 setRemoteVideoStreams(prev => ({ ...prev, [otherUid]: event.streams[0] }));
            }
        };

        pc.onconnectionstatechange = () => {
             setConnectionState(pc.connectionState);
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                _cleanupPeerConnection(otherUid);
            }
        };
        return pc;
    }, [user, _cleanupPeerConnection]);
    
     const handleSignal = useCallback(async ({ from, signal, type }: { from: string, signal: any, type: string }) => {
        let pc = peerConnections.current[from];
        if (!pc) {
           pc = createPeerConnection(from)!;
        }

        try {
            if (type === 'offer') {
                if (pc.signalingState !== 'stable') return;
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socketRef.current?.emit('signal', { to: from, from: user!.uid, type: 'answer', signal: pc.localDescription });
                
            } else if (type === 'answer') {
                 if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                }
            } else if (type === 'ice-candidate') {
                 if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal));
                }
            }
        } catch (error) {
            console.error(`Error handling signal type ${type} from ${from}:`, error);
        }
    }, [user, createPeerConnection]);

    // This effect ensures that whenever localStream changes, it's added to all existing peer connections.
    useEffect(() => {
        if (localStream) {
            for (const peerId in peerConnections.current) {
                const pc = peerConnections.current[peerId];
                const senders = pc.getSenders();
                senders.forEach(sender => {
                    if (sender.track?.kind === 'audio') {
                        pc.removeTrack(sender);
                    }
                });
                localStream.getAudioTracks().forEach(track => {
                    pc.addTrack(track, localStream);
                });
            }
        }
    }, [localStream]);
    
    const joinVoice = useCallback(async (options: { muted?: boolean } = {}) => {
        if (!user || !userData || !activeRoomId || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, 
            });
            
            if (stream.getAudioTracks()[0] && options.muted) {
                stream.getAudioTracks()[0].enabled = false;
            }
            setLocalStream(stream);

            await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: userData.username, photoURL: userData.photoURL }, { initialMuteState: options.muted ?? false });
            
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://walk-server.onrender.com';
            socketRef.current = io(socketUrl, { transports: ['websocket'] });

            socketRef.current.on('connect', () => {
                socketRef.current?.emit('join-room', activeRoomId, user.uid);
            });
            
            // New user receives the list of existing users and initiates connection to them
            socketRef.current.on('existing-users', (userIds: string[]) => {
                userIds.forEach(uid => {
                    const pc = createPeerConnection(uid);
                    if (pc) {
                         pc.createOffer()
                            .then(offer => pc.setLocalDescription(offer))
                            .then(() => {
                                socketRef.current?.emit('signal', { to: uid, from: user.uid, type: 'offer', signal: pc.localDescription });
                            });
                    }
                });
            });
            
            // An existing user gets notified of a new user and initiates connection
            socketRef.current.on('user-connected', (newUserId: string) => {
                 const pc = createPeerConnection(newUserId);
                 if(pc) {
                     pc.createOffer()
                        .then(offer => pc.setLocalDescription(offer))
                        .then(() => {
                             socketRef.current?.emit('signal', { to: newUserId, from: user.uid, type: 'offer', signal: pc.localDescription });
                        });
                 }
            });

            socketRef.current.on('signal', handleSignal);
            
            socketRef.current.on('user-disconnected', (disconnectedUserId: string) => {
                _cleanupPeerConnection(disconnectedUserId);
            });
            
            setSessionDuration(0);
            sessionDurationIntervalRef.current = setInterval(() => {
                setSessionDuration(prev => prev + 1);
            }, 1000);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: "Mikrofon veya kamera erişimi reddedildi." });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, userData, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState, createPeerConnection, handleSignal, _cleanupPeerConnection]);

    const leaveVoiceOnly = useCallback(async () => {
        if (!user || !activeRoomId) return;
        await leaveVoice(activeRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, activeRoomId, _cleanupAndResetState]);
    
    const leaveRoom = useCallback(async () => {
        const currentPath = pathname;
        await leaveVoiceOnly();
        setActiveRoomId(null);
        setActiveRoom(null);
        if (currentPath.startsWith('/rooms/')) {
            router.push('/rooms');
        }
    }, [leaveVoiceOnly, router, pathname]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
            if (!newMutedState && user) {
                updateLastActive(activeRoomId, user.uid);
            }
        }
    }, [self, activeRoomId, localStream, user]);

    useEffect(() => {
        if (!user || !activeRoomId) {
            _cleanupAndResetState();
            setParticipants([]);
            setActiveRoom(null);
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), (docSnap) => {
            if (docSnap.exists()) {
                 setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                 if (activeRoomId && pathname.startsWith('/rooms/')) {
                     toast({ title: "Oda Kapatıldı", description: "Oda sahibi tarafından kapatıldığı veya süresi dolduğu için odadan çıkarıldınız."});
                     leaveRoom();
                 }
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);

            if (isConnected && !fetched.some(p => p.uid === user.uid)) {
                _cleanupAndResetState();
            }
        });
        
        return () => { roomUnsub(); participantsUnsub(); };
    }, [user, activeRoomId, isConnected, leaveRoom, _cleanupAndResetState, toast, pathname]);
    
    const minimizeRoom = useCallback(() => {
        if (pathname.startsWith('/rooms/')) {
            setIsMinimized(true);
            router.back();
        }
    }, [router, pathname]);
    
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);
    const addTrackToPlaylist = useCallback(async (data: { fileName: string, fileDataUrl: string }) => { if(!user || !activeRoomId || !userData) return; setIsMusicLoading(true); try { await addTrackAction({ roomId: activeRoomId, fileName: data.fileName, fileDataUrl: data.fileDataUrl, }, { uid: user.uid, username: userData.username }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, userData, toast]);
    const removeTrackFromPlaylist = useCallback(async (trackId: string) => { if (!user || !activeRoomId) return; setIsMusicLoading(true); try { await removeTrackAction(activeRoomId, trackId, user.uid); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, toast]);
    const togglePlayback = useCallback(async () => { if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);
    const skipTrack = useCallback(async (direction: 'next' | 'previous') => { if (!user || !activeRoomId || !isCurrentUserDj) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction }); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, toast]);
    
    const startScreenShare = useCallback(async () => {
        if (!isConnected || isSharingScreen) return;
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            setLocalScreenStream(stream);
            for (const peerId in peerConnections.current) {
                const pc = peerConnections.current[peerId];
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }
        } catch (error) {
            console.error("Ekran paylaşımı başlatılamadı:", error);
        }
    }, [isConnected, isSharingScreen]);

    const stopScreenShare = useCallback(async () => {
        if (!localScreenStream) return;
        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
    }, [localScreenStream]);
    
    const stopVideo = useCallback(async () => {
        if (!self || !activeRoomId || !localStream || !isSharingVideo) return;
        
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.stop();
            localStream.removeTrack(videoTrack);
        }
        setIsSharingVideo(false);
        await updateVideoStatus(activeRoomId, self.uid, false);

    }, [self, activeRoomId, localStream, isSharingVideo]);
    
    const startVideo = useCallback(async () => {
        if (!self || !activeRoomId || !localStream || isSharingVideo) return;
        try {
            const videoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
            const videoTrack = videoStream.getVideoTracks()[0];
            localStream.addTrack(videoTrack);
            setLocalStream(localStream); // Trigger re-render
            setIsSharingVideo(true);
            await updateVideoStatus(activeRoomId, self.uid, true);
        } catch(e) {
            toast({ variant: 'destructive', description: 'Kamera erişimi reddedildi.' });
        }
    }, [self, activeRoomId, localStream, isSharingVideo, facingMode, toast]);

    const switchCamera = useCallback(async () => {
        if (!isConnected || !localStream || !isSharingVideo) return;
        
        const videoTrack = localStream.getVideoTracks()[0];
        if(videoTrack) {
            videoTrack.stop();
            localStream.removeTrack(videoTrack);
        }

        const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(newFacingMode);
        
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } });
            const newVideoTrack = newStream.getVideoTracks()[0];
            localStream.addTrack(newVideoTrack);
            setLocalStream(localStream); // Trigger re-render
        } catch (e) {
            toast({ variant: 'destructive', description: 'Kamera değiştirilemedi.' });
        }


    }, [isConnected, localStream, isSharingVideo, facingMode, toast]);


    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, localStream, remoteAudioStreams, remoteVideoStreams, isSharingScreen, isSharingVideo, localScreenStream,
        micPermission, camPermission, connectionState, sessionDuration, micGain, setMicGain, speakerVolume, setSpeakerVolume,
        setActiveRoomId, joinVoice, leaveRoom, leaveVoiceOnly, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom,
        startScreenShare, stopScreenShare, startVideo, stopVideo, switchCamera,
        livePlaylist, currentTrack, isCurrentUserDj, isDjActive, isMusicLoading,
        addTrackToPlaylist, removeTrackFromPlaylist, togglePlayback, skipTrack
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat must be used within a VoiceChatProvider');
    return context;
};
