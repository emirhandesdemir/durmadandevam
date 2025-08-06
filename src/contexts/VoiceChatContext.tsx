
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, serverTimestamp, query, where, deleteDoc, addDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant, PlaylistTrack } from '@/lib/types';
import { joinVoiceChat, leaveVoice as leaveVoiceAction, toggleSelfMute as toggleMuteAction, updateVideoStatus } from '@/lib/actions/voiceActions';
import { leaveRoom } from '@/lib/actions/roomActions';
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
    localStream: MediaStream | null;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteVideoStreams: Record<string, MediaStream>;
    setActiveRoomId: (id: string | null) => void;
    joinVoice: (options?: { muted?: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    leaveVoiceOnly: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    toggleSpeakerMute: () => void;
    minimizeRoom: () => void;
    expandRoom: () => void;
    toggleVideo: () => Promise<void>;
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
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});
    
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    
    const self = participants.find(p => p.uid === user?.uid);
    const isConnected = !!self;

    const _cleanupAndResetState = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        setRemoteAudioStreams({});
        setRemoteVideoStreams({});
        setIsConnecting(false);
    }, [localStream]);

    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoomId || !user) return;
        const signalsRef = collection(db, 'rooms', activeRoomId, 'signals');
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoomId, user]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from];
        if (!pc) {
            console.warn(`Peer connection for ${from} not found.`);
            return;
        }

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(from, 'answer', pc.localDescription!.toJSON());
            } else if (type === 'answer') {
                 if (pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
            } else if (type === 'ice-candidate') {
                 if (pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                }
            }
        } catch (error) {
            console.error(`Error handling signal type ${type} from ${from}:`, error);
        }
    }, [sendSignal]);

    useEffect(() => {
        if (!user || !activeRoomId) {
            _cleanupAndResetState();
            setActiveRoom(null);
            setParticipants([]);
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), (docSnap) => {
            if (docSnap.exists()) {
                 setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                if (pathname.startsWith('/rooms/')) {
                    toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil.' });
                    router.push('/rooms');
                }
                setActiveRoom(null);
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
            if (isConnected && user && !fetched.some(p => p.uid === user.uid)) {
                _cleanupAndResetState();
            }
        });
        
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${activeRoomId}/signals`), where('to', '==', user.uid)), async snapshot => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    await handleSignal(signal.from, signal.type, signal.data);
                    await deleteDoc(change.doc.ref);
                }
            }
        });

        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); };
    }, [user, activeRoomId, pathname, router, toast, isConnected, _cleanupAndResetState, handleSignal]);

    const joinVoice = useCallback(async (options?: { muted?: boolean }) => {
        if (!user || !userData || !activeRoomId || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
            if (stream.getAudioTracks()[0]) {
                stream.getAudioTracks()[0].enabled = !(options?.muted ?? false);
            }
            setLocalStream(stream);
            await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: userData.username, photoURL: userData.photoURL }, { initialMuteState: options?.muted ?? false });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: "Mikrofon erişimi reddedildi veya bir hata oluştu." });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, userData, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);
    
     useEffect(() => {
        if (!isConnected || !localStream || !user) return;

        const otherParticipants = participants.filter(p => p.uid !== user.uid);

        // Connect to new participants
        for (const participant of otherParticipants) {
            if (!peerConnections.current[participant.uid]) {
                const pc = new RTCPeerConnection(ICE_SERVERS);
                peerConnections.current[participant.uid] = pc;

                localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

                pc.onicecandidate = event => {
                    if (event.candidate) sendSignal(participant.uid, 'ice-candidate', event.candidate.toJSON());
                };

                pc.ontrack = event => {
                    setRemoteAudioStreams(prev => ({ ...prev, [participant.uid]: event.streams[0] }));
                };
                
                // Polite peer logic: the user with the greater UID is the initiator
                if(user.uid > participant.uid) {
                     pc.onnegotiationneeded = async () => {
                        try {
                            await pc.setLocalDescription(await pc.createOffer());
                            if(pc.localDescription) await sendSignal(participant.uid, 'offer', pc.localDescription.toJSON());
                        } catch (e) {
                            console.error("Offer creation failed:", e);
                        }
                    };
                }
            }
        }

        // Clean up connections for left participants
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                peerConnections.current[uid].close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(prev => {
                    const newStreams = {...prev};
                    delete newStreams[uid];
                    return newStreams;
                });
            }
        });

    }, [isConnected, localStream, participants, user, sendSignal]);
    
    const leaveVoiceOnly = useCallback(async () => {
        if (!user || !activeRoomId) return;
        await leaveVoiceAction(activeRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, activeRoomId, _cleanupAndResetState]);
    
    const handleLeaveRoom = useCallback(async () => {
        if (!user || !activeRoomId) return;
        await leaveVoiceOnly();
        await leaveRoom(activeRoomId, user.uid, user.displayName || 'Biri');
        router.push('/rooms');
    }, [user, activeRoomId, leaveVoiceOnly, router]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
        }
    }, [self, activeRoomId, localStream]);
    
    const toggleVideo = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        
        let videoTrack = localStream.getVideoTracks()[0];
        const currentlyEnabled = videoTrack ? videoTrack.enabled : false;

        if (currentlyEnabled) {
            videoTrack.enabled = false;
        } else {
            if (!videoTrack) {
                try {
                    const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    const newVideoTrack = videoStream.getVideoTracks()[0];
                    localStream.addTrack(newVideoTrack);
                    for (const pc of Object.values(peerConnections.current)) {
                        pc.addTrack(newVideoTrack, localStream);
                    }
                    videoTrack = newVideoTrack;
                } catch (e) {
                    toast({ variant: "destructive", title: "Kamera Açılamadı", description: "Kamera erişimi reddedildi." });
                    return;
                }
            }
            videoTrack.enabled = true;
        }
        setIsVideoOff(!videoTrack.enabled);
        await updateVideoStatus(activeRoomId, self.uid, videoTrack.enabled);
    }, [self, activeRoomId, localStream, toast]);

    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);
    
    const memoizedParticipants = useMemo(() => {
        return participants.map(p => ({ ...p, isSpeaker: !!speakingStates[p.uid] }));
    }, [participants, speakingStates]);
    
    const value = {
        activeRoom, participants: memoizedParticipants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, localStream, remoteAudioStreams, remoteVideoStreams,
        setActiveRoomId, joinVoice, leaveRoom: handleLeaveRoom, leaveVoiceOnly, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom, toggleVideo,
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}


export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat must be used within a VoiceChatProvider');
    return context;
};
