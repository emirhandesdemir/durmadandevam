'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction } from '@/lib/actions/voiceActions';
import { usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean;
    joinRoom: (roomToJoin: Room) => Promise<void>;
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    const pathname = usePathname();
    const { toast } = useToast();

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);

    // Aktif bir oda varsa, katılımcıları dinle
    useEffect(() => {
        if (!activeRoom || !user) {
            setParticipants([]);
            return;
        }

        const voiceParticipantsRef = collection(db, "rooms", activeRoom.id, "voiceParticipants");
        const unsubscribe = onSnapshot(voiceParticipantsRef, (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
            
            // Eğer mevcut kullanıcı katılımcı listesinden çıkarıldıysa (örn. atıldıysa), yerel durumu temizle
            if (participants.length > 0 && !snapshot.docs.some(doc => doc.id === user.uid)) {
                leaveRoom(true); // Sunucuya tekrar istek göndermeden zorla çıkış yap
            }
        }, (error) => {
             console.error("Voice participants listener error:", error);
             toast({ variant: "destructive", title: "Bağlantı Hatası", description: "Sesli sohbet durumu alınamadı." });
        });

        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeRoom, user]);
    
    // Kullanıcı odaya geri döndüğünde, oda verilerini (örn. katılımcı sayısı) güncelle
    useEffect(() => {
      if (activeRoom && pathname === `/rooms/${activeRoom.id}`) {
        const roomRef = doc(db, 'rooms', activeRoom.id);
        getDoc(roomRef).then(docSnap => {
          if (docSnap.exists()) {
            setActiveRoom({ id: docSnap.id, ...docSnap.data() } as Room);
          }
        });
      }
    }, [pathname, activeRoom]);

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            const result = await joinVoiceChat(roomToJoin.id, {
                uid: user.uid,
                displayName: user.displayName,
                photoURL: user.photoURL,
            });

            if (result.success) {
                setActiveRoom(roomToJoin);
                // Optimistic UI Update: Add self to participants list immediately
                const selfParticipant: VoiceParticipant = {
                    uid: user.uid,
                    username: user.displayName || 'Anonim',
                    photoURL: user.photoURL,
                    isSpeaker: roomToJoin.createdBy.uid === user.uid,
                    isMuted: roomToJoin.createdBy.uid !== user.uid,
                    joinedAt: new Date() as unknown as Timestamp, // Temporary timestamp
                };
                setParticipants(prev => [...prev, selfParticipant]);

            } else {
                throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            }

        } catch (error: any) {
            console.error("Sesli sohbete katılamadı:", error);
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, isConnecting, toast]);

    const leaveRoom = useCallback(async (force = false) => {
        if (!user || !activeRoom) return;

        // force=false ise sunucuya ayrılma isteği gönder
        if (!force) {
            await leaveVoiceChat(activeRoom.id, user.uid);
        }
        
        // Yerel durumu temizle
        setActiveRoom(null);
        setParticipants([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, activeRoom]);
    
    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoom) return;

        // Daha iyi bir kullanıcı deneyimi için anında arayüzü güncelle (optimistic update)
        const newMutedState = !self.isMuted;
        setParticipants(prev => prev.map(p => p.uid === self.uid ? { ...p, isMuted: newMutedState } : p));
        
        await toggleMuteAction(activeRoom.id, self.uid, newMutedState);
    }, [self, activeRoom]);

    const value = {
        activeRoom,
        participants,
        self,
        isConnecting,
        isConnected,
        joinRoom,
        leaveRoom,
        toggleSelfMute,
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
