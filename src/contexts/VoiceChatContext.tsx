'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

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
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    // Internal state, NOT derived from URL. This is the key change.
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;
    
    // Completely reset the voice chat state and connections.
    const cleanupConnections = useCallback(() => {
        console.log("Cleaning up all connections and resetting state.");
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        setRemoteStreams({});
        setParticipants([]);
        setActiveRoom(null); // This clears the active room and triggers listener cleanup
    }, [localStream]);
    
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoom, user]);
    
    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream) return;
        if (peerConnections.current[otherUid]) return peerConnections.current[otherUid];

        console.log(`Creating peer connection to ${otherUid}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = event => {
            console.log(`Received remote track from ${otherUid}`);
            setRemoteStreams(prev => ({ ...prev, [otherUid]: event.streams[0] }));
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(otherUid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        const isInitiator = user.uid > otherUid;
        if (isInitiator) {
             pc.onnegotiationneeded = async () => {
                try {
                    await pc.setLocalDescription(await pc.createOffer());
                    if (pc.localDescription) {
                       await sendSignal(otherUid, 'offer', pc.localDescription.toJSON());
                    }
                } catch (e) {
                    console.error("Negotiation error:", e);
                }
            };
        }
        return pc;
    }, [user, localStream, sendSignal]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from];
        if (!pc) {
            console.warn(`Received signal from ${from}, but no peer connection exists.`);
            return;
        }

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (pc.localDescription) {
                    await sendSignal(from, 'answer', pc.localDescription.toJSON());
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

    // This effect sets up all Firestore listeners when `activeRoom` is set.
    useEffect(() => {
        if (!user || !activeRoom) {
            return;
        }
        
        const currentRoomId = activeRoom.id;
        console.log(`Setting up listeners for room: ${currentRoomId}`);

        const roomUnsub = onSnapshot(doc(db, "rooms", currentRoomId), (docSnap) => {
            if (!docSnap.exists()) {
                toast({
                    title: "Oda Kapatıldı",
                    description: "Bulunduğunuz oda kapatıldığı için bağlantınız kesildi.",
                    variant: "destructive"
                });
                cleanupConnections();
                router.push('/rooms');
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", currentRoomId, "voiceParticipants"), (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);

            if (isConnected && !fetchedParticipants.some(p => p.uid === user.uid)) {
                toast({
                    title: "Bağlantı Kesildi",
                    description: "Sesten ayrıldınız veya atıldınız.",
                });
                cleanupConnections();
            }
        });
        
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${currentRoomId}/signals`), where('to', '==', user.uid)), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    handleSignal(signal.from, signal.type, signal.data);
                    await deleteDoc(change.doc.ref).catch(e => console.error("Signal delete error:", e));
                }
            });
        });

        return () => {
            console.log(`Cleaning up listeners for room: ${currentRoomId}`);
            roomUnsub();
            participantsUnsub();
            signalsUnsub();
        };
    }, [user, activeRoom, isConnected, cleanupConnections, handleSignal, router, toast]);
    
    // This effect manages peer connections based on the participant list.
    useEffect(() => {
        if (!isConnected || !user || !localStream) return;
        
        const otherParticipants = participants.filter(p => p.uid !== user.uid);
        const existingPeerIds = Object.keys(peerConnections.current);

        otherParticipants.forEach(p => {
            if (!existingPeerIds.includes(p.uid)) {
                createPeerConnection(p.uid);
            }
        });

        existingPeerIds.forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                console.log(`Closing peer connection to ${uid}`);
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteStreams(prev => {
                    const newStreams = {...prev};
                    delete newStreams[uid];
                    return newStreams;
                });
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection]);


    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || (isConnected && activeRoom?.id === roomToJoin.id) || isConnecting) return;
        
        if (activeRoom && activeRoom.id !== roomToJoin.id) {
             await leaveVoiceChat(activeRoom.id, user.uid);
             cleanupConnections();
        }

        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            const result = await joinVoiceChat(roomToJoin.id, {
                uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
            });

            if (!result.success) throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            
            setActiveRoom(roomToJoin);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            cleanupConnections();
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, activeRoom, isConnecting, toast, cleanupConnections]);

    const leaveRoom = useCallback(async () => {
        if (!user || !activeRoom) return;
        await leaveVoiceChat(activeRoom.id, user.uid);
        cleanupConnections();
    }, [user, activeRoom, cleanupConnections]);
    
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
