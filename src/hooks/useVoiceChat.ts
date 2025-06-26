// src/hooks/useVoiceChat.ts
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { VoiceParticipant } from '@/lib/types';
import { updateSpeakerStatus } from '@/lib/actions/voiceActions';

/**
 * Sesli sohbetin istemci tarafı mantığını yöneten custom hook.
 * Katılımcıları dinler, yerel durumu yönetir ve inaktivite takibi yapar.
 * @param roomId Sesli sohbetin ait olduğu oda ID'si.
 */
export function useVoiceChat(roomId: string) {
    const { user } = useAuth();
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!roomId || !user) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        // Gerçek WebRTC bağlantı mantığı burada başlar.
        console.log(`[useVoiceChat] Simulating WebRTC connection setup for room ${roomId}`);

        const voiceParticipantsRef = collection(db, "rooms", roomId, "voiceParticipants");
        const q = query(voiceParticipantsRef, orderBy("joinedAt", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
            setIsLoading(false);
        }, (error) => {
            console.error("[useVoiceChat] Firestore dinleyicisinde hata:", error);
            setIsLoading(false);
        });

        // Hook temizlendiğinde WebRTC bağlantılarını kapat ve dinleyiciyi sonlandır
        return () => {
            console.log(`[useVoiceChat] Simulating WebRTC connection teardown for room ${roomId}`);
            unsubscribe();
             if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [roomId, user]);

    const self = participants.find(p => p.uid === user?.uid);

    // Konuşmacı inaktivite takibi
    useEffect(() => {
        // Eğer zamanlayıcı zaten çalışıyorsa temizle
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }

        // Eğer mevcut kullanıcı bir hoparlör ise inaktivite zamanlayıcısını başlat
        if (self?.isSpeaker) {
            console.log(`[useVoiceChat] Inactivity timer started for ${self.username} (3 minutes).`);
            inactivityTimerRef.current = setTimeout(async () => {
                console.log(`[useVoiceChat] ${self.username} was inactive for 3 minutes, downgrading to listener.`);
                // 3 dakika sonra kullanıcıyı dinleyiciye düşür
                await updateSpeakerStatus(roomId, self.uid, false);
            }, 3 * 60 * 1000); // 3 dakika
        }

        // Bileşen kaldırıldığında veya 'self' durumu değiştiğinde zamanlayıcıyı temizle
        return () => {
            if (inactivityTimerRef.current) {
                clearTimeout(inactivityTimerRef.current);
            }
        };
    }, [self?.isSpeaker, roomId, self?.uid, self?.username]);


    return {
        participants,
        self,
        isConnected: participants.some(p => p.uid === user?.uid),
        isLoading
    };
}
