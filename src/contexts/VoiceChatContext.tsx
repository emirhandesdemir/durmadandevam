'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, getDoc, Timestamp, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { usePathname } from 'next/navigation';
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
    const pathname = usePathname();
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
    
    // --- Katılımcı Listesi Dinleyicisi ---
    useEffect(() => {
        const pathParts = pathname.split('/');
        // Check if we are on a room page: /rooms/[id]
        const roomIdFromPath = pathParts[1] === 'rooms' && pathParts[2] ? pathParts[2] : null;

        // The room to listen to is the one we are actively connected to,
        // OR the one we are currently viewing on its page.
        const roomIdToListen = activeRoom?.id || roomIdFromPath;

        if (!roomIdToListen) {
            // If there's no room to listen to, clear participants and stop.
            if (participants.length > 0) setParticipants([]);
            return;
        }

        const voiceParticipantsRef = collection(db, "rooms", roomIdToListen, "voiceParticipants");
        const unsubscribe = onSnapshot(voiceParticipantsRef, (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
        }, (error) => {
             console.error("Voice participants listener error:", error);
             toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Sesli sohbet durumu alınamadı." });
        });

        return () => unsubscribe();
    }, [activeRoom?.id, pathname, toast]);


    const leaveRoom = useCallback(async (force = false) => {
        if (!user || !activeRoom) return;

        // Only call server if not a forced local cleanup
        if (!force) {
            try {
                await leaveVoiceChat(activeRoom.id, user.uid);
            } catch (e) {
                console.error("Failed to call leaveVoiceChat action:", e);
            }
        }
        
        // Close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        // Stop local media stream
        localStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);

        // Clear state immediately for the leaving user's UI
        setRemoteStreams({});
        setActiveRoom(null);
        setParticipants([]);
    }, [user, activeRoom, localStream]);
    
    // Effect to handle user leaving the page (closing tab, navigating away)
    useEffect(() => {
        const handleBeforeUnload = () => {
            // This is a "fire and forget" call. The browser does not guarantee
            // completion of async operations on unload.
            if (isConnected && activeRoom && user) {
                leaveVoiceChat(activeRoom.id, user.uid);
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isConnected, activeRoom, user]);


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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeRoom, localStream]);


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

        // Optimistic UI: Add user to participants list immediately
        const optimisticParticipant: VoiceParticipant = {
            uid: user.uid,
            username: user.displayName || 'Anonim',
            photoURL: user.photoURL,
            isSpeaker: true,
            isMuted: false, // Start unmuted
            joinedAt: new Date() as unknown as Timestamp, // Temporary timestamp
        };
        setParticipants(prev => [...prev, optimisticParticipant]);
        setActiveRoom(roomToJoin);

        try {
            // Get microphone permission and start local stream
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            setLocalStream(stream);

            // Send join request to the server
            const result = await joinVoiceChat(roomToJoin.id, {
                uid: user.uid, displayName: user.displayName, photoURL: user.photoURL,
            });

            if (!result.success) {
                throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            }
            // On success, the real-time listener will update the participant list with the correct data
        } catch (error: any) {
            console.error("Could not join voice chat:", error);
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            // Rollback optimistic UI on error
            leaveRoom(true);
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, isConnecting, toast, leaveRoom]);


    
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
