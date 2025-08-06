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
    
    // Music Player State
    const [livePlaylist, setLivePlaylist] = useState<PlaylistTrack[]>([]);
    const [isMusicLoading, setIsMusicLoading] = useState(false);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const videoSenderRef = useRef<Record<string, RTCRtpSender>>({});
    
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
    

    const _cleanupAndResetState = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);
        setIsSharingVideo(false);

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
    
    const createPeerConnection = useCallback((otherUid: string, isInitiator: boolean): RTCPeerConnection => {
        if (peerConnections.current[otherUid]) {
            console.warn(`Peer connection for ${otherUid} already exists.`);
            return peerConnections.current[otherUid];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;

        localStream?.getTracks().forEach(track => {
            try {
                pc.addTrack(track, localStream);
            } catch (e) {
                console.error(`Error adding track for ${otherUid}:`, e);
            }
        });

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(otherUid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        pc.ontrack = event => {
            const stream = event.streams[0];
            if (event.track.kind === 'audio') {
                 setRemoteAudioStreams(prev => ({ ...prev, [otherUid]: stream }));
            } else if (event.track.kind === 'video') {
                 setRemoteVideoStreams(prev => ({ ...prev, [otherUid]: stream }));
            }
        };
        
        pc.onconnectionstatechange = () => {
            if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) {
                _cleanupAndResetState();
            }
        };

        if(isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (pc.localDescription) await sendSignal(otherUid, 'offer', pc.localDescription.toJSON());
                } catch(e) {
                     console.error('Negotiation error:', e);
                }
            }
        }

        return pc;
    }, [localStream, sendSignal, _cleanupAndResetState]);
    
    const joinVoice = useCallback(async (options: { muted?: boolean } = {}) => {
        if (!user || !userData || !activeRoomId || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                audio: { 
                    echoCancellation: true, 
                    noiseSuppression: true, 
                    autoGainControl: true 
                }, 
                video: { facingMode: 'user' }
            });

            if (stream.getVideoTracks()[0]) {
                stream.getVideoTracks()[0].enabled = false;
            }
            if (stream.getAudioTracks()[0] && options.muted) {
                stream.getAudioTracks()[0].enabled = false;
            }

            setLocalStream(stream);
            await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: userData.username, photoURL: userData.photoURL, profileEmoji: userData.profileEmoji, selectedAvatarFrame: userData.selectedAvatarFrame }, { initialMuteState: options.muted ?? false });
            setConnectedRoomId(activeRoomId);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: "Mikrofon veya kamera erişimi reddedildi." });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, userData, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);

    const leaveVoiceOnly = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoice(connectedRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, connectedRoomId, _cleanupAndResetState]);
    
    const leaveRoom = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoiceOnly();
        router.push('/rooms');
    }, [leaveVoiceOnly, router, user, connectedRoomId]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(connectedRoomId, self.uid, newMutedState);
            if (!newMutedState && user) {
                updateLastActive(connectedRoomId, user.uid);
            }
        }
    }, [self, connectedRoomId, localStream, user]);

    useEffect(() => {
        if (!user || !connectedRoomId) {
            _cleanupAndResetState();
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", connectedRoomId), (docSnap) => {
            if (docSnap.exists()) {
                 setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                 if (connectedRoomId) leaveRoom();
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", connectedRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
        });

        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${connectedRoomId}/signals`), where('to', '==', user.uid)), async snapshot => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    const from = signal.from;
                    const pc = peerConnections.current[from] || createPeerConnection(from, false);
                    if (signal.type === 'offer') {
                        if (pc.signalingState !== 'stable') return;
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        await sendSignal(from, 'answer', pc.localDescription!.toJSON());
                    } else if (signal.type === 'answer' && pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                    } else if (signal.type === 'ice-candidate' && pc.remoteDescription) {
                         await pc.addIceCandidate(new RTCIceCandidate(signal.data));
                    }
                    await deleteDoc(change.doc.ref);
                }
            }
        });
        
        const playlistUnsub = onSnapshot(collection(db, "rooms", connectedRoomId, "playlist"), snapshot => {
            const tracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PlaylistTrack)).sort((a,b) => a.order - b.order);
            setLivePlaylist(tracks);
        });


        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); playlistUnsub(); };
    }, [user, connectedRoomId, leaveRoom, createPeerConnection, sendSignal]);
    
     useEffect(() => {
        if (!isConnected || !localStream || !user) return;
        const otherParticipants = participants.filter(p => p.uid !== user.uid);

        otherParticipants.forEach(p => {
            if (user.uid > p.uid) {
                createPeerConnection(p.uid, true);
            }
        });

        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                 peerConnections.current[uid]?.close();
                 delete peerConnections.current[uid];
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection]);

    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);
    const addTrackToPlaylist = useCallback(async (data: { fileName: string, fileDataUrl: string }) => { if(!user || !activeRoomId || !userData) return; setIsMusicLoading(true); try { await addTrackAction({ roomId: activeRoomId, fileName: data.fileName, fileDataUrl: data.fileDataUrl, }, { uid: user.uid, username: userData.username }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, userData, toast]);
    const removeTrackFromPlaylist = useCallback(async (trackId: string) => { if (!user || !activeRoomId) return; setIsMusicLoading(true); try { await removeTrackAction(activeRoomId, trackId, user.uid); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, toast]);
    const togglePlayback = useCallback(async () => { if (!user || !activeRoomId || (!isCurrentUserDj && isDjActive)) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'toggle' }); } catch (e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, isDjActive, toast]);
    const skipTrack = useCallback(async (direction: 'next' | 'previous') => { if (!user || !activeRoomId || !isCurrentUserDj) return; setIsMusicLoading(true); try { await controlPlaybackAction(activeRoomId, user.uid, { action: 'skip', direction }); } catch(e: any) { toast({ variant: 'destructive', description: e.message }); } finally { setIsMusicLoading(false); } }, [user, activeRoomId, isCurrentUserDj, toast]);
    const stopScreenShare = useCallback(async () => { if (!user || !connectedRoomId || !localScreenStream) return; localScreenStream.getTracks().forEach(track => track.stop()); setLocalScreenStream(null); for (const peerId in peerConnections.current) { const sender = screenSenderRef.current[peerId]; if (sender) { peerConnections.current[peerId].removeTrack(sender); delete screenSenderRef.current[peerId]; } } await toggleScreenShareAction(connectedRoomId, user.uid, false); }, [user, connectedRoomId, localScreenStream]);
    const startScreenShare = useCallback(async () => { if (!user || !connectedRoomId || isSharingScreen || !localStream) return; try { if (!navigator?.mediaDevices?.getDisplayMedia) { throw new Error('Tarayıcınız bu özelliği desteklemiyor gibi görünüyor.'); } const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as MediaTrackConstraints, audio: false }); const screenTrack = screenStream.getVideoTracks()[0]; if (!screenTrack) throw new Error("No screen track found"); screenTrack.onended = () => stopScreenShare(); setLocalScreenStream(screenStream); for (const peerId in peerConnections.current) { screenSenderRef.current[peerId] = peerConnections.current[peerId].addTrack(screenTrack, screenStream); } await toggleScreenShareAction(connectedRoomId, user.uid, true); } catch (error: any) { let description = 'Ekran paylaşımı başlatılamadı.'; if (error.name === 'NotAllowedError') { description = 'Ekran paylaşımı için izin vermeniz gerekiyor.'; } toast({ variant: 'destructive', title: 'Hata', description: description }); } }, [user, connectedRoomId, isSharingScreen, stopScreenShare, toast, localStream]);
    const stopVideo = useCallback(async () => { if (!self || !connectedRoomId || !localStream || !isSharingVideo) return; const videoTrack = localStream.getVideoTracks()[0]; if (videoTrack) { videoTrack.enabled = false; setIsSharingVideo(false); await toggleVideoAction(connectedRoomId, self.uid, false); } }, [self, connectedRoomId, localStream, isSharingVideo]);
    const startVideo = useCallback(async () => { if (!self || !connectedRoomId || !localStream || isSharingVideo) return; const videoTrack = localStream.getVideoTracks()[0]; if (videoTrack) { videoTrack.enabled = true; setIsSharingVideo(true); await toggleVideoAction(connectedRoomId, self.uid, true); } }, [self, connectedRoomId, localStream, isSharingVideo]);
    const switchCamera = useCallback(async () => { if (!isConnected || !localStream || !isSharingVideo) return; const oldTrack = localStream.getVideoTracks()[0]; if (oldTrack) { oldTrack.stop(); localStream.removeTrack(oldTrack); } const newFacingMode = facingMode === 'user' ? 'environment' : 'user'; try { const newVideoStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacingMode } }); const newVideoTrack = newVideoStream.getVideoTracks()[0]; if (!newVideoTrack) throw new Error("Yeni kamera akışı alınamadı."); localStream.addTrack(newVideoTrack); for (const peerId in peerConnections.current) { const sender = peerConnections.current[peerId].getSenders().find(s => s.track?.kind === 'video'); if (sender) { await sender.replaceTrack(newVideoTrack); } } setFacingMode(newFacingMode); } catch (error) { toast({ variant: 'destructive', title: 'Kamera Değiştirilemedi', description: 'Arka kamera bulunamadı veya bir hata oluştu.' }); await stopVideo(); } }, [isConnected, localStream, isSharingVideo, facingMode, toast, stopVideo]);


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
