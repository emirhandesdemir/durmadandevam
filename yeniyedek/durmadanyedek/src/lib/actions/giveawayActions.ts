// src/lib/actions/giveawayActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, runTransaction, arrayUnion, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Room, UserProfile, Giveaway } from '../types';
import { addSystemMessage } from './roomActions';

export async function startGiveaway(roomId: string, hostId: string, prize: string) {
    if (!roomId || !hostId || !prize) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        if (roomData.giveaway && roomData.giveaway.status === 'active') {
            throw new Error("Zaten aktif bir çekiliş var.");
        }

        const newGiveaway: Giveaway = {
            status: 'active',
            prize,
            participants: [],
            startedAt: serverTimestamp() as any,
        };

        transaction.update(roomRef, { giveaway: newGiveaway });
    });
    
    await addSystemMessage(roomId, `🎁 Yeni bir çekiliş başladı! Ödül: ${prize}`);

    return { success: true };
}

export async function joinGiveaway(roomId: string, userId: string, userInfo: { username: string, photoURL: string | null }) {
    if (!roomId || !userId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);
    await updateDoc(roomRef, {
        'giveaway.participants': arrayUnion({ uid: userId, ...userInfo })
    });

    return { success: true };
}

export async function drawGiveawayWinner(roomId: string, hostId: string) {
    if (!roomId || !hostId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);

    return await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }
        const giveaway = roomData.giveaway;
        if (!giveaway || giveaway.status !== 'active' || giveaway.participants.length === 0) {
            throw new Error("Çekiliş başlatılamadı veya hiç katılımcı yok.");
        }

        const winner = giveaway.participants[Math.floor(Math.random() * giveaway.participants.length)];
        
        transaction.update(roomRef, {
            'giveaway.status': 'finished',
            'giveaway.winner': winner,
            'giveaway.endedAt': serverTimestamp(),
        });

        // Here you would add logic to actually award the prize, e.g., update user diamonds.
        // For now, we'll just announce the winner.
        await addSystemMessage(roomId, `🎉 Çekilişin kazananı: @${winner.username}! Ödülü (${giveaway.prize}) kazandı.`);

        return { success: true, winner };
    });
}

export async function cancelGiveaway(roomId: string, hostId: string) {
    if (!roomId || !hostId) throw new Error("Gerekli bilgiler eksik.");

    const roomRef = doc(db, 'rooms', roomId);
    
    await runTransaction(db, async (transaction) => {
        const roomDoc = await transaction.get(roomRef);
        if (!roomDoc.exists()) throw new Error("Oda bulunamadı.");
        const roomData = roomDoc.data() as Room;

        if (roomData.createdBy.uid !== hostId) {
            throw new Error("Bu işlemi yapma yetkiniz yok.");
        }

        transaction.update(roomRef, {
             'giveaway.status': 'idle',
             'giveaway.prize': '',
             'giveaway.participants': [],
             'giveaway.winner': null
        });
    });

    await addSystemMessage(roomId, 'Çekiliş oda sahibi tarafından iptal edildi.');
    return { success: true };
}
