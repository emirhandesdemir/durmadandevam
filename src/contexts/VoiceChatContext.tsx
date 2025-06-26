'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, getDoc, Timestamp, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

// Google'ın halka açık STUN sunucuları
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
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const { toast } = useToast();

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    // WebRTC states
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});

    // --- Katılımcı Listesi Dinleyicisi ---
    useEffect(() => {
        if (!activeRoom || !user) {
            setParticipants([]);
            return;
        }

        const voiceParticipantsRef = collection(db, "rooms", activeRoom.id, "voiceParticipants");
        const unsubscribe = onSnapshot(voiceParticipantsRef, (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
            
            if (participants.length > 0 && !snapshot.docs.some(doc => doc.id === user.uid)) {
                leaveRoom(true);
            }
        }, (error) => {
             console.error("Voice participants listener error:", error);
             toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Sesli sohbet durumu alınamadı." });
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoom, user]);
    
    // --- Sinyalleşme Dinleyicisi (WebRTC için) ---
    useEffect(() => {
        if (!user || !activeRoom || !localStream) return;

        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        const q = query(signalsRef, where('to', '==', user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    handleSignal(signal.from, signal.type, signal.data);
                    await deleteDoc(change.doc.ref);
                }
            });
        });

        return () => unsubscribe();
    }, [user, activeRoom, localStream]);

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;

    // --- Peer Connection Yöneticisi ---
    useEffect(() => {
        if (!isConnected || !localStream || !user) return;
        
        // Yeni katılanlara bağlan
        participants.forEach(p => {
            if (p.uid !== user.uid && !peerConnections.current[p.uid]) {
                createPeerConnection(p.uid, true);
            }
        });

        // Ayrılanların bağlantısını temizle
        Object.keys(peerConnections.current).forEach(uid => {
            if (!participants.some(p => p.uid === uid)) {
                peerConnections.current[uid].close();
                delete peerConnections.current[uid];
                setRemoteStreams(prev => {
                    const newStreams = {...prev};
                    delete newStreams[uid];
                    return newStreams;
                });
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [participants, isConnected, localStream, user?.uid]);

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
                pc.close();
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
        
        if (type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            if(pc.localDescription) await sendSignal(from, 'answer', pc.localDescription.toJSON());
        } else if (type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (type === 'ice-candidate') {
            await pc.addIceCandidate(new RTCIceCandidate(data));
        }
    };

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            // Mikrofon izni al ve local stream'i başlat
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            // Veritabanına katılma eylemini gönder
            const result = await joinVoiceChat(roomToJoin.id, {
                uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
            });

            if (result.success) {
                setActiveRoom(roomToJoin);
            } else {
                stream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
                throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            }
        } catch (error: any) {
            console.error("Sesli sohbete katılamadı:", error);
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            setLocalStream(null); // Başarısız olursa stream'i temizle
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, isConnecting, toast]);

    const leaveRoom = useCallback(async (force = false) => {
        if (!user || !activeRoom) return;

        if (!force) {
            await leaveVoiceChat(activeRoom.id, user.uid);
        }
        
        // Tüm peer connection'ları kapat
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        // Local media stream'i durdur
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        // State'i temizle
        setRemoteStreams({});
        setActiveRoom(null);
        setParticipants([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeRoom, localStream]);
    
    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoom || !localStream) return;

        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState; // Enable track if not muted
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
