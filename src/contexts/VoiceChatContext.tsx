
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, Timestamp, addDoc, query, where, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

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
    const router = useRouter();
    const pathname = usePathname();
    const roomId = pathname.startsWith('/rooms/') ? pathname.split('/')[2] : null;

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
        console.log("Cleaning up connections...");
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
        
        console.log("Leaving room:", activeRoom.id);
        
        if (!force) {
            try {
                await leaveVoiceChat(activeRoom.id, user.uid);
            } catch (e) {
                console.error("Failed to call leaveVoiceChat action:", e);
            }
        }
        cleanupConnections(true);
    }, [user, activeRoom, cleanupConnections]);

     // Listen for room data based on URL
    useEffect(() => {
        if (!roomId) {
            if (activeRoom) {
                // We navigated away from the room, but let the persistent bar handle leaving.
            }
            return;
        }

        // If we are already connected to a different room, leave it first.
        if(activeRoom && activeRoom.id !== roomId) {
            leaveRoom(true);
        }

        if (!activeRoom || activeRoom.id !== roomId) {
             const roomRef = doc(db, 'rooms', roomId);
             getDoc(roomRef).then(docSnap => {
                if (docSnap.exists()) {
                    setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
                }
            });
        }

    }, [roomId, activeRoom, leaveRoom]);
    
    // --- Katılımcı ve Sinyal Dinleyicileri ---
    useEffect(() => {
        if (!user || !activeRoom) {
            return;
        }
        
        const currentRoomId = activeRoom.id;
        console.log(`Setting up listeners for room: ${currentRoomId}`);

        // Katılımcıları dinle
        const participantsUnsub = onSnapshot(collection(db, "rooms", currentRoomId, "voiceParticipants"), (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
            console.log("Updated participants:", fetchedParticipants);
        }, (error) => {
             console.error("Voice participants listener error:", error);
             toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Sesli sohbet durumu alınamadı." });
        });
        
        // Sinyalleri dinle
        const signalsRef = collection(db, `rooms/${currentRoomId}/signals`);
        const q = query(signalsRef, where('to', '==', user.uid));
        
        const signalsUnsub = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    console.log("Received signal:", signal.type, "from:", signal.from);
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
            console.log(`Cleaning up listeners for room: ${currentRoomId}`);
            participantsUnsub();
            signalsUnsub();
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeRoom]);


    // --- Peer Connection Yöneticisi ---
    useEffect(() => {
        if (!isConnected || !localStream || !user) return;
        
        const existingPeerIds = Object.keys(peerConnections.current);
        const newParticipantIds = participants.map(p => p.uid).filter(uid => uid !== user.uid);

        // Yeni katılımcılar için bağlantı kur
        newParticipantIds.forEach(otherUid => {
            if (!existingPeerIds.includes(otherUid)) {
                // "Glare" (her iki tarafın da aynı anda başlatıcı olması) durumunu önlemek için,
                // UID'si alfabetik olarak daha büyük olan kullanıcı bağlantıyı başlatır.
                const isInitiator = user.uid > otherUid;
                if (isInitiator) {
                    console.log(`Initiating connection to ${otherUid}`);
                    createPeerConnection(otherUid, true);
                } else {
                    console.log(`Waiting for offer from ${otherUid}`);
                }
            }
        });

        // Ayrılan katılımcılar için bağlantıları temizle
        existingPeerIds.forEach(uid => {
            if (!newParticipantIds.includes(uid)) {
                console.log("Closing peer connection to:", uid);
                peerConnections.current[uid]?.close();
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
    
    // Tarayıcı kapatıldığında/sayfadan ayrıldığında odadan ayrıl
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
             if (isConnected && activeRoom && user) {
                // Bu senkron bir işlemdir, bu nedenle async fonksiyonu çağırmak
                // tamamlanacağını garanti etmez, ancak yapabileceğimizin en iyisidir.
                leaveVoiceChat(activeRoom.id, user.uid);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isConnected, activeRoom, user]);


    const sendSignal = async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        console.log("Sending signal:", type, "to:", to);
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    };

    const createPeerConnection = (uid: string, isInitiator: boolean) => {
        if (!localStream || !user) return null;

        console.log(`Creating peer connection for ${uid}. Initiator: ${isInitiator}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[uid] = pc;
        
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(uid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        pc.ontrack = event => {
            console.log("Received remote track from:", uid);
            setRemoteStreams(prev => ({ ...prev, [uid]: event.streams[0] }));
        };

        pc.onconnectionstatechange = () => {
            console.log(`Peer connection state for ${uid}: ${pc.connectionState}`);
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
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'ice-candidate') {
                 if (data && pc.remoteDescription) { // Only add candidates after remote description is set
                    await pc.addIceCandidate(new RTCIceCandidate(data));
                 }
            }
        } catch (error) {
            console.error("Error handling signal:", type, error);
        }
    };

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || isConnected || isConnecting) return;
        
        console.log("Attempting to join room:", roomToJoin.id);
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
            // setActiveRoom is now handled by the URL effect, but we can set it here for quicker UI response
            setActiveRoom(roomToJoin); 
            console.log("Successfully joined room server-side:", roomToJoin.id);

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
