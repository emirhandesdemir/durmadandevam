'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, Timestamp, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
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
    remoteStreams: Record<string, MediaStream>;
    joinRoom: (roomToJoin: Room) => Promise<void>;
    leaveRoom: (force?: boolean) => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const roomId = pathname.startsWith('/rooms/') && pathname.split('/').length > 2 ? pathname.split('/')[2] : null;

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;

    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoom, user]);
    
    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        
        if (localStream) {
            localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
        }

        pc.ontrack = event => {
            setRemoteStreams(prev => ({ ...prev, [otherUid]: event.streams[0] }));
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(otherUid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        // The 'polite' peer (lexicographically smaller UID) waits for offer.
        // The 'impolite' peer (lexicographically larger UID) creates the offer.
        const isInitiator = user.uid > otherUid;
        if (isInitiator) {
            pc.onnegotiationneeded = async () => {
                try {
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    if (pc.localDescription) {
                        sendSignal(otherUid, 'offer', pc.localDescription.toJSON());
                    }
                } catch (e) {
                    console.error("Negotiation error:", e);
                }
            };
        }
    }, [user, localStream, sendSignal]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from];
        if (!pc) return;

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (pc.localDescription) {
                    sendSignal(from, 'answer', pc.localDescription.toJSON());
                }
            } else if (type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'ice-candidate') {
                if (data && pc.remoteDescription) {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                }
            }
        } catch (error) {
            console.error("Signal handling error:", type, error);
        }
    }, [sendSignal]);

    const cleanupConnections = useCallback((shouldClearActiveRoom = true) => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        setRemoteStreams({});
        setParticipants([]);
        if (shouldClearActiveRoom) {
            setActiveRoom(null);
        }
    }, [localStream]);

    const leaveRoom = useCallback(async (force = false) => {
        if (!user || !activeRoom) return;
        
        if (!force) {
            await leaveVoiceChat(activeRoom.id, user.uid);
        }
        cleanupConnections(true);
    }, [user, activeRoom, cleanupConnections]);
    
    // Effect to handle navigation and room data listening
    useEffect(() => {
        if (!roomId) {
            return;
        }

        if (activeRoom && activeRoom.id !== roomId) {
            leaveRoom(true); 
        }

        const roomRef = doc(db, 'rooms', roomId);
        const unsubscribe = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
            } else {
                if (activeRoom?.id === roomId) {
                    toast({
                        title: "Oda Kapatıldı",
                        description: "Bulunduğunuz oda kapatıldığı için bağlantınız kesildi.",
                        variant: "destructive"
                    });
                    cleanupConnections(true);
                    router.push('/rooms');
                }
            }
        });

        return () => unsubscribe();
    }, [roomId, activeRoom, leaveRoom, router, toast, cleanupConnections]);
    
    // Effect to listen to participants and signals
    useEffect(() => {
        if (!user || !activeRoom) {
            return;
        }
        
        const currentRoomId = activeRoom.id;

        const participantsUnsub = onSnapshot(collection(db, "rooms", currentRoomId, "voiceParticipants"), (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
             if (isConnected && !fetchedParticipants.some(p => p.uid === user.uid)) {
                toast({
                    title: "Bağlantı Kesildi",
                    description: "Sesten ayrıldınız veya atıldınız.",
                    variant: "destructive"
                });
                cleanupConnections(false);
            }
        });
        
        const signalsRef = collection(db, `rooms/${currentRoomId}/signals`);
        const q = query(signalsRef, where('to', '==', user.uid));
        
        const signalsUnsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    handleSignal(signal.from, signal.type, signal.data);
                    await deleteDoc(change.doc.ref).catch(e => console.error("Signal delete error:", e));
                }
            });
        });

        return () => {
            participantsUnsub();
            signalsUnsub();
        };
    }, [user, activeRoom, handleSignal, isConnected, cleanupConnections, toast]);

    // Effect to manage peer connections based on participant list
    useEffect(() => {
        if (!user || !activeRoom) return;
        
        const otherParticipants = participants.filter(p => p.uid !== user.uid);
        const existingPeerIds = Object.keys(peerConnections.current);

        otherParticipants.forEach(p => {
            if (!existingPeerIds.includes(p.uid)) {
                createPeerConnection(p.uid);
            }
        });

        existingPeerIds.forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteStreams(prev => {
                    const newStreams = {...prev};
                    delete newStreams[uid];
                    return newStreams;
                });
            }
        });
    }, [user, activeRoom, participants, createPeerConnection]);

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            await joinVoiceChat(roomToJoin.id, {
                uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
            });
            
            Object.values(peerConnections.current).forEach(pc => {
                 stream.getTracks().forEach(track => {
                    if (!pc.getSenders().find(s => s.track === track)) {
                       pc.addTrack(track, stream);
                    }
                });
            })

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            cleanupConnections(false);
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, isConnecting, toast, cleanupConnections]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoom || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoom.id, self.uid, newMutedState);
        }
    }, [self, activeRoom, localStream]);

    const value = {
        activeRoom, participants, self, isConnecting, isConnected, remoteStreams,
        joinRoom, leaveRoom, toggleSelfMute,
    };

    return (
        <VoiceChatContext.Provider value={value}>
            {children}
        </VoiceChatContext.Provider>
    );
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) {
        throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    }
    return context;
};

    