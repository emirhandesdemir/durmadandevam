// src/lib/actions/mindWarActions.ts
'use server';

// Bu dosya, "Zihin Savaşları" oyununun sunucu taraflı mantığını yönetir.
// Firestore işlemleri ve yapay zeka akışlarının çağrılması burada yapılır.

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import type { MindWarSession, Room } from '../types';
import { initializeMindWar, processMindWarTurn } from '@/ai/flows/mindWarGameFlow';
import { revalidatePath } from 'next/cache';

// Oyunu başlatan sunucu eylemi
export async function startMindWar(args: {
  roomId: string;
  hostId: string;
  playerUids: string[];
  theme: string;
}) {
  const { roomId, hostId, playerUids, theme } = args;
  if (!roomId || !hostId || playerUids.length < 2 || !theme) {
    throw new Error('Geçersiz oyun başlatma bilgileri.');
  }

  const roomRef = doc(db, 'rooms', roomId);
  const mindWarSessionsRef = collection(roomRef, 'mindWarSessions');
  const newSessionRef = doc(mindWarSessionsRef);

  // Firestore transaction'ı başlatarak veri tutarlılığını sağla
  await runTransaction(db, async (transaction) => {
    const roomDoc = await transaction.get(roomRef);
    if (!roomDoc.exists()) throw new Error('Oda bulunamadı.');

    const roomData = roomDoc.data() as Room;
    if (roomData.activeMindWarSessionId) throw new Error('Bu odada zaten aktif bir oyun var.');

    // Oyuncu bilgilerini Firestore'dan çek
    const playerPromises = playerUids.map(uid => getDoc(doc(db, 'users', uid)));
    const playerDocs = await Promise.all(playerPromises);
    const playersInfo = playerDocs.map(doc => {
        if (!doc.exists()) throw new Error(`Oyuncu bulunamadı: ${doc.id}`);
        const data = doc.data();
        return { uid: data.uid, username: data.username, photoURL: data.photoURL || null };
    });

    // Yapay zeka akışını çağırarak oyunun başlangıç durumunu oluştur
    const initialState = await initializeMindWar({
      players: playersInfo,
      theme: theme,
    });
    
    // Oluşturulan başlangıç durumunu Firestore'a yaz
    transaction.set(newSessionRef, { ...initialState, createdAt: serverTimestamp() });

    // Odanın aktif oyun ID'sini güncelle
    transaction.update(roomRef, { activeMindWarSessionId: newSessionRef.id });
  });

  // İlgili oda sayfasının verilerini yeniden doğrula (önbelleği temizle)
  revalidatePath(`/rooms/${roomId}`);
  
  return { success: true, sessionId: newSessionRef.id };
}

// Oyuncunun hamlesini işleyen sunucu eylemi
export async function makeMindWarMove(args: {
  roomId: string;
  sessionId: string;
  playerId: string;
  choice: { key: string; text: string };
}) {
  const { roomId, sessionId, playerId, choice } = args;
  const sessionRef = doc(db, 'rooms', roomId, 'mindWarSessions', sessionId);

  await runTransaction(db, async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists()) throw new Error('Oyun oturumu bulunamadı.');

    const currentSession = sessionDoc.data() as MindWarSession;
    if (currentSession.status !== 'ongoing') throw new Error('Oyun aktif değil.');
    if (currentSession.currentTurn.activePlayerUid !== playerId) throw new Error('Sıra sizde değil.');

    // Yapay zeka akışını çağırarak yeni tur durumunu al
    const nextState = await processMindWarTurn({
      currentState: currentSession,
      playerMove: {
        playerId,
        choiceKey: choice.key,
        choiceText: choice.text,
      },
    });

    // Firestore'da oyun durumunu güncelle
    transaction.update(sessionRef, nextState);
  });

  // İlgili oda sayfasının verilerini yeniden doğrula
  revalidatePath(`/rooms/${roomId}`);

  return { success: true };
}
