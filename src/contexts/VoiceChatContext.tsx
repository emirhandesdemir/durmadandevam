
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, Timestamp, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';

// Google's halka açık STUN sunucuları
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
    remoteStreams: Record<string, MediaStream>; // UID -> MediaStream
    joinRoom: (roomToJoin: Room) => Promise<void>;
    leaveRoom: (force?: boolean) => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    // WebRTC states
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;

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
            try {
                await leaveVoiceChat(activeRoom.id, user.uid);
            } catch (e) {
                console.error("Failed to call leaveVoiceChat action:", e);
            }
        }
        cleanupConnections(true);
    }, [user, activeRoom, cleanupConnections]);

    
    // --- Katılımcı ve Sinyal Dinleyicileri ---
    useEffect(() => {
        if (!user || !activeRoom) {
            return;
        }
        
        const roomId = activeRoom.id;

        // Katılımcıları dinle
        const participantsUnsub = onSnapshot(collection(db, "rooms", roomId, "voiceParticipants"), (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
        }, (error) => {
             console.error("Voice participants listener error:", error);
             toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Sesli sohbet durumu alınamadı." });
        });
        
        // Sinyalleri dinle
        const signalsRef = collection(db, `rooms/${roomId}/signals`);
        const q = query(signalsRef, where('to', '==', user.uid));
        
        const signalsUnsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    handleSignal(signal.from, signal.type, signal.data);
                    try {
                        await deleteDoc(change.doc.ref);
                    } catch (e) {
                        console.error("Sinyal silinirken hata:", e);
                    }
                }
            });
        });

        return () => {
            participantsUnsub();
            signalsUnsub();
        };
    }, [user, activeRoom, toast]);


    // --- Peer Connection Yöneticisi ---
    useEffect(() => {
        if (!isConnected || !localStream || !user) return;
        
        const currentPeerIds = Object.keys(peerConnections.current);
        const newParticipantIds = participants.map(p => p.uid).filter(uid => uid !== user.uid);

        newParticipantIds.forEach(uid => {
            if (!currentPeerIds.includes(uid)) {
                createPeerConnection(uid, true); // initiator
            }
        });

        currentPeerIds.forEach(uid => {
            if (!newParticipantIds.includes(uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteStreams(prev => {
                    const newStreams = {...prev};
                    delete newStreams[uid];
                    return newStreams;
                });
            }
        });
    }, [participants, isConnected, localStream, user?.uid]);
    
    // Tarayıcı kapatıldığında/sayfadan ayrıldığında odadan ayrıl
    useEffect(() => {
        const handleBeforeUnload = () => {
             if (activeRoom && user) {
                leaveVoiceChat(activeRoom.id, user.uid);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [activeRoom, user]);


    const sendSignal = async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    };

    const createPeerConnection = (uid: string, isInitiator: boolean) => {
        if (!localStream || !user) return null;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[uid] = pc;
        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(uid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        pc.ontrack = event => {
            setRemoteStreams(prev => ({ ...prev, [uid]: event.streams[0] }));
        };

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected' || pc.connectionState === 'closed') {
               peerConnections.current[uid]?.close();
               delete peerConnections.current[uid];
                setRemoteStreams(prev => {
                   const newStreams = {...prev};
                   delete newStreams[uid];
                   return newStreams;
               });
            }
        }

        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    if(pc.localDescription) sendSignal(uid, 'offer', pc.localDescription.toJSON());
                }).catch(e => console.error("Offer creation failed:", e));
        }
        return pc;
    };
    
    const handleSignal = async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from] || createPeerConnection(from, false);
        if (!pc) return;
        
        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if(pc.localDescription) await sendSignal(from, 'answer', pc.localDescription.toJSON());
            } else if (type === 'answer') {
                 if (pc.signalingState !== 'stable') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
            } else if (type === 'ice-candidate') {
                 if (data) {
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                 }
            }
        } catch (error) {
            console.error("Error handling signal:", type, error);
        }
    };

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || isConnected || isConnecting) return;
        setIsConnecting(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            const result = await joinVoiceChat(roomToJoin.id, {
                uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
            });

            if (!result.success) {
                throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            }
            setActiveRoom(roomToJoin);
        } catch (error: any) {
            console.error("Could not join voice chat:", error);
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            cleanupConnections(true);
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
