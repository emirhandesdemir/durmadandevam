// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '../types';
import { joinVoiceChat, leaveVoice, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
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
    setActiveRoomId: (id: string | null) => void;
    joinVoice: (options?: { muted?: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    leaveVoiceOnly: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    minimizeRoom: () => void;
    expandRoom: () => void;
    toggleSpeakerMute: () => void;
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
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});
    
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    
    const self = useMemo(() => participants.find(p => p.uid === user?.uid) || null, [participants, user?.uid]);
    const isConnected = !!self;

    const cleanupPeerConnection = useCallback((uid: string) => {
        if (peerConnections.current[uid]) {
            peerConnections.current[uid].close();
            delete peerConnections.current[uid];
        }
        setRemoteAudioStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[uid];
            return newStreams;
        });
        setRemoteVideoStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[uid];
            return newStreams;
        });
    }, []);

    const _cleanupAndResetState = useCallback(() => {
        Object.keys(peerConnections.current).forEach(uid => cleanupPeerConnection(uid));
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setIsConnecting(false);
        setActiveRoom(null);
        setParticipants([]);
    }, [localStream, cleanupPeerConnection]);

    const createPeerConnection = useCallback((otherUid: string, isInitiator: boolean): RTCPeerConnection => {
        if (peerConnections.current[otherUid]) {
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
                const signalsRef = collection(db, 'rooms', activeRoomId!, 'signals');
                addDoc(signalsRef, { to: otherUid, from: user!.uid, type: 'ice-candidate', data: event.candidate.toJSON(), createdAt: serverTimestamp() });
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
                cleanupPeerConnection(otherUid);
            }
        };

        if(isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    const signalsRef = collection(db, 'rooms', activeRoomId!, 'signals');
                    await addDoc(signalsRef, { to: otherUid, from: user!.uid, type: 'offer', data: pc.localDescription!.toJSON(), createdAt: serverTimestamp() });
                } catch(e) {
                     console.error('Nego error:', e);
                }
            }
        }

        return pc;
    }, [localStream, activeRoomId, user, cleanupPeerConnection]);

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
                video: false 
            });
            
            if (options.muted && stream.getAudioTracks()[0]) {
                stream.getAudioTracks()[0].enabled = false;
            }

            setLocalStream(stream);
            await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: userData.username, photoURL: userData.photoURL, profileEmoji: userData.profileEmoji, selectedAvatarFrame: userData.selectedAvatarFrame }, { initialMuteState: options.muted ?? false });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: "Mikrofon erişimi reddedildi veya bir hata oluştu." });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, userData, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);

    const leaveVoiceOnly = useCallback(async () => {
        if (!user || !activeRoomId) return;
        await leaveVoice(activeRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, activeRoomId, _cleanupAndResetState]);
    
    const leaveRoom = useCallback(async () => {
        await leaveVoiceOnly();
        router.push('/rooms');
    }, [leaveVoiceOnly, router]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
        }
    }, [self, activeRoomId, localStream]);
    
    useEffect(() => {
        if (!user || !activeRoomId) {
            _cleanupAndResetState();
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), (docSnap) => {
            if (docSnap.exists()) {
                 setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                 if (activeRoomId) router.push('/rooms');
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
                    const from = signal.from;
                    const pc = peerConnections.current[from] || createPeerConnection(from, false);
                    if (signal.type === 'offer') {
                        if (pc.signalingState !== 'stable') return;
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        const signalsRef = collection(db, 'rooms', activeRoomId!, 'signals');
                        await addDoc(signalsRef, { to: from, from: user!.uid, type: 'answer', data: pc.localDescription!.toJSON(), createdAt: serverTimestamp() });
                    } else if (signal.type === 'answer' && pc.signalingState === 'have-local-offer') {
                        await pc.setRemoteDescription(new RTCSessionDescription(signal.data));
                    } else if (signal.type === 'ice-candidate') {
                         await pc.addIceCandidate(new RTCIceCandidate(signal.data));
                    }
                    await deleteDoc(change.doc.ref);
                }
            }
        });

        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); };
    }, [user, activeRoomId, isConnected, _cleanupAndResetState, createPeerConnection, router]);
    
     useEffect(() => {
        if (!isConnected || !localStream || !user) return;
        const otherParticipants = participants.filter(p => p.uid !== user.uid);

        otherParticipants.forEach(p => {
             // Initiate connection only if user ID is greater (polite peer)
            if (user.uid > p.uid) {
                createPeerConnection(p.uid, true);
            }
        });

        // Clean up connections for users who have left
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                cleanupPeerConnection(uid);
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection, cleanupPeerConnection]);
    

    const minimizeRoom = useCallback(() => setIsMinimized(true), []);
    const expandRoom = useCallback(() => setIsMinimized(false), []);
    const toggleSpeakerMute = useCallback(() => setIsSpeakerMuted(prev => !prev), []);
    
    const value = {
        activeRoom, participants, self, isConnecting, isConnected, isMinimized, isSpeakerMuted, localStream, remoteAudioStreams, remoteVideoStreams,
        setActiveRoomId, joinVoice, leaveRoom, leaveVoiceOnly, toggleSelfMute, toggleSpeakerMute, minimizeRoom, expandRoom,
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat must be used within a VoiceChatProvider');
    return context;
};
