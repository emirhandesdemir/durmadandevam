// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, addDoc, deleteDoc, getDoc, updateDoc, writeBatch, arrayUnion, arrayRemove, setDoc, limit, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '../types';
import { joinVoiceChat, leaveVoice, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction, updateLastActive } from '@/lib/actions/voiceActions';
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
    
    // Music Player State
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);
    const [isMusicLoading, setIsMusicLoading] = useState(false);
    
    // RTC and Socket State
    const socketRef = useRef<Socket | null>(null);
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const iceCandidateQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
    
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
    
    const _cleanupPeerConnection = useCallback((uid: string) => {
        if (peerConnections.current[uid]) {
            peerConnections.current[uid].close();
            delete peerConnections.current[uid];
        }
        setRemoteAudioStreams(prev => { const s = {...prev}; delete s[uid]; return s; });
        setRemoteVideoStreams(prev => { const s = {...prev}; delete s[uid]; return s; });
    }, []);

    const _cleanupAndResetState = useCallback(() => {
        Object.keys(peerConnections.current).forEach(_cleanupPeerConnection);
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setIsSharingVideo(false);

        socketRef.current?.disconnect();
        socketRef.current = null;
        
        setIsConnecting(false);
    }, [localStream, _cleanupPeerConnection]);

    const handleSignal = useCallback(async ({ from, signal, type }: { from: string, signal: any, type: string }) => {
        const pc = peerConnections.current[from];
        if (!pc) return; // Should not happen if everything is in sync

        try {
            if (type === 'offer') {
                if (pc.signalingState !== 'stable') return;
                await pc.setRemoteDescription(new RTCSessionDescription(signal));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                socketRef.current?.emit('signal', { to: from, from: user!.uid, type: 'answer', signal: pc.localDescription });
                
                // Process any queued candidates
                if (iceCandidateQueue.current[from]) {
                    iceCandidateQueue.current[from].forEach(candidate => pc.addIceCandidate(new RTCIceCandidate(candidate)));
                    delete iceCandidateQueue.current[from];
                }
            } else if (type === 'answer') {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(signal));
                }
            } else if (type === 'ice-candidate') {
                 if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(signal));
                } else {
                    // Queue the candidate if the remote description isn't set yet
                    if (!iceCandidateQueue.current[from]) iceCandidateQueue.current[from] = [];
                    iceCandidateQueue.current[from].push(signal);
                }
            }
        } catch (error) {
            console.error(`Error handling signal type ${type} from ${from}:`, error);
        }
    }, [user]);

    const createPeerConnection = useCallback((otherUid: string, isInitiator: boolean) => {
        if (peerConnections.current[otherUid]) {
             console.warn(`Peer connection for ${otherUid} already exists. Skipping.`);
             return;
        }
        
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;

        localStream?.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.onicecandidate = event => {
            if (event.candidate && user) {
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
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                _cleanupPeerConnection(otherUid);
            }
        };

        if(isInitiator && user) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socketRef.current?.emit('signal', { to: otherUid, from: user.uid, type: 'offer', signal: pc.localDescription });
                } catch(e) { console.error('Negotiation error:', e); }
            }
        }
    }, [localStream, user, _cleanupPeerConnection]);

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
            
            // Connect to Socket.IO server
            const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
            socketRef.current = io(socketUrl, { transports: ['websocket'] });

            socketRef.current.on('connect', () => {
                socketRef.current?.emit('join-room', activeRoomId, user.uid);
            });

            socketRef.current.on('user-connected', (newUserId: string) => {
                 console.log("New user connected, creating peer connection for", newUserId);
                 createPeerConnection(newUserId, true);
            });

            socketRef.current.on('signal', handleSignal);
            
            socketRef.current.on('user-disconnected', (disconnectedUserId: string) => {
                console.log("User disconnected:", disconnectedUserId);
                _cleanupPeerConnection(disconnectedUserId);
            });


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
        await leaveVoiceOnly();
        setActiveRoomId(null);
        setActiveRoom(null);
        router.push('/rooms');
    }, [leaveVoiceOnly, router]);

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
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), (docSnap) => {
            if (docSnap.exists()) {
                 setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                 if (activeRoomId) leaveRoom();
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
        });
        
        return () => { roomUnsub(); participantsUnsub(); };
    }, [user, activeRoomId, leaveRoom]);
    
    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);
    const addTrackToPlaylist = useCallback(async (data: { fileName: string, fileDataUrl: string }) => { if(!user || !activeRoomId || !userData) return; setIsMusicLoading(true); try { await addTrackAction({ roomId: activeRoomId, fileName: data.fileName, fileDataUrl: data.fileDataUrl, }, { uid: user.uid, username: userData.username }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, userData, toast]);
    const removeTrackFromPlaylist = useCallback(async (trackId: string) => { if (!user || !activeRoomId) return; setIsMusicLoading(true); try { await removeTrackAction(activeRoomId, trackId, user.uid); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, toast]);
    const togglePlayback = useCallback(async () => { if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);
    const skipTrack = useCallback(async (direction: 'next' | 'previous') => { if (!user || !activeRoomId || !isCurrentUserDj) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction }); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, toast]);
    const stopScreenShare = useCallback(async () => { if (!user || !activeRoomId || !localScreenStream) return; }, [user, activeRoomId, localScreenStream]);
    const startScreenShare = useCallback(async () => { if (!user || !activeRoomId || isSharingScreen || !localStream) return; }, [user, activeRoomId, isSharingScreen, localStream]);
    const stopVideo = useCallback(async () => { if (!self || !activeRoomId || !localStream || !isSharingVideo) return; }, [self, activeRoomId, localStream, isSharingVideo]);
    const startVideo = useCallback(async () => { if (!self || !activeRoomId || !localStream || isSharingVideo) return; }, [self, activeRoomId, localStream, isSharingVideo]);
    const switchCamera = useCallback(async () => { if (!isConnected || !localStream || !isSharingVideo) return; }, [isConnected, localStream, isSharingVideo]);


    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, localStream, remoteAudioStreams, remoteVideoStreams, isSharingScreen, isSharingVideo, localScreenStream,
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
