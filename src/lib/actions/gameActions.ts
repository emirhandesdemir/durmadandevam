// src/lib/actions/gameActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    serverTimestamp,
    getDoc,
    writeBatch,
    runTransaction,
    query,
    limit,
    Timestamp,
    increment,
    where,
    setDoc,
    arrayUnion,
    getDocs
} from "firebase/firestore";
import type { GameQuestion, GameSettings, ActiveGame, Room } from "../types";
import { revalidatePath } from "next/cache";
import { generateQuizQuestion } from '@/ai/flows/generateQuizQuestionFlow';


// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        const firestoreData = docSnap.data();
        return {
            dailyDiamondLimit: 50,
            gameIntervalMinutes: 5,
            questionTimerSeconds: 15,
            rewardAmount: 5,
            cooldownSeconds: 30,
            afkTimeoutMinutes: 8,
            imageUploadQuality: 0.9,
            audioBitrate: 64,
            videoBitrate: 1000,
            matchmakingCost: 5,
            ...firestoreData
        } as GameSettings;
    }
    return {
        dailyDiamondLimit: 50,
        gameIntervalMinutes: 5,
        questionTimerSeconds: 15,
        rewardAmount: 5,
        cooldownSeconds: 30,
        afkTimeoutMinutes: 8,
        imageUploadQuality: 0.9,
        audioBitrate: 64,
        videoBitrate: 1000,
        matchmakingCost: 5,
    };
}

// Ayarları güncellemek için fonksiyon
export async function updateGameSettings(settings: Partial<GameSettings>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    await setDoc(settingsRef, settings, { merge: true });
    revalidatePath('/admin/system');
}

// --- Quiz Oyunu Mekanikleri ---

/**
 * Bir odada yeni bir quiz oyunu başlatır.
 * Yapay zekadan rastgele bir soru alır ve oda için bir oyun dokümanı oluşturur.
 * @param roomId Oyunun başlatılacağı odanın ID'si.
 */
export async function startGameInRoom(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    
    const activeGamesQuery = query(collection(roomRef, 'games'), where('status', '==', 'active'), limit(1));
    const activeGamesSnapshot = await getDocs(activeGamesQuery);
    if (!activeGamesSnapshot.empty) {
        console.warn("Zaten aktif bir oyun var, yeni oyun başlatılamadı.");
        return { success: false, error: "Zaten aktif bir oyun var."};
    }

    // AI'dan soru al
    const questionData = await generateQuizQuestion({});
    if (!questionData || !questionData.question || !questionData.options || typeof questionData.correctOptionIndex !== 'number') {
        throw new Error("AI'dan geçerli bir soru alınamadı.");
    }

    const gamesRef = collection(roomRef, 'games');
    const newGame = {
        questionId: `ai-${Date.now()}`,
        question: questionData.question,
        options: questionData.options,
        correctOptionIndex: questionData.correctOptionIndex,
        startTime: serverTimestamp(),
        status: 'active',
        answeredBy: [],
    };
    await addDoc(gamesRef, newGame);
    
    const systemMessage = {
        type: 'game',
        text: `Yeni bir oyun başlıyor!`,
        createdAt: serverTimestamp(),
        uid: 'system',
        username: 'System'
    };
    await addDoc(collection(roomRef, 'messages'), systemMessage);

    return { success: true };
}


/**
 * Bir sonraki oyunun başlama zamanını ayarlar.
 * @param transaction Aktif Firestore transaction'ı.
 * @param roomRef Güncellenecek oda referansı.
 */
async function setNextGameTime(transaction: any, roomRef: any) {
    const settings = await getGameSettings();
    const intervalMillis = settings.gameIntervalMinutes * 60 * 1000;
    const nextGameTimestamp = Timestamp.fromMillis(Date.now() + intervalMillis);
    transaction.update(roomRef, { nextGameTimestamp });
}


/**
 * Bir kullanıcının oyun cevabını işler.
 * @param roomId Oda ID'si
 * @param gameId Oyun ID'si
 * @param userId Cevap veren kullanıcı ID'si
 * @param answerIndex Kullanıcının cevabının indeksi (0-3)
 */
export async function submitAnswer(roomId: string, gameId: string, userId: string, answerIndex: number) {
    const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(roomRef, 'games', gameId);
    const userRef = doc(db, 'users', userId);
    const messagesRef = collection(roomRef, 'messages');

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            const userDoc = await transaction.get(userRef);
            
            if (!gameDoc.exists() || !userDoc.exists()) {
                throw new Error("Oyun veya kullanıcı bulunamadı.");
            }

            const gameData = gameDoc.data() as ActiveGame;
            const userData = userDoc.data();

            if (gameData.status !== 'active') {
                throw new Error("Bu oyun artık aktif değil.");
            }
            if ((gameData.answeredBy || []).includes(userId)) {
                throw new Error("Bu soruya zaten cevap verdin.");
            }

            transaction.update(gameRef, { answeredBy: arrayUnion(userId) });
            
            if (gameData.correctOptionIndex === answerIndex) {
                // Oyunu bitir ve kazananı belirle
                transaction.update(gameRef, { status: 'finished', winner: userId, finishedAt: serverTimestamp() });
                await setNextGameTime(transaction, roomRef);

                const settings = await getGameSettings();
                const reward = settings.rewardAmount;

                let messageText = `🎉 ${userData.username} doğru cevap verdi!`;

                // Kazanan kullanıcıya ödülünü ver
                transaction.update(userRef, {
                    diamonds: increment(reward)
                });
                messageText = `🎉 ${userData.username} doğru cevap verdi ve ${reward} elmas kazandı!`;
                
                const systemMessage = {
                    type: 'game', text: messageText,
                    createdAt: serverTimestamp(), uid: 'system', username: 'System',
                };
                transaction.set(doc(messagesRef), systemMessage);
            }
        });
    } catch (e: any) {
        console.error("Cevap işlenirken hata:", e);
        throw e;
    }
}


/**
 * Süre dolduğunda veya kimse doğru cevap veremediğinde oyunu bitirir.
 * @param roomId Oda ID'si
 * @param gameId Oyun ID'si
 */
export async function endGameWithoutWinner(roomId: string, gameId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(roomRef, 'games', gameId);
    const messagesRef = collection(roomRef, 'messages');

    try {
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);

            if (!gameDoc.exists() || gameDoc.data().status !== 'active') {
                return;
            }

            const gameData = gameDoc.data();
            const correctOptionText = gameData?.options?.[gameData.correctOptionIndex] || 'Bilinmeyen';

            transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
            
            await setNextGameTime(transaction, roomRef);

            const systemMessage = {
                type: 'game',
                text: `Süre doldu! Kimse doğru cevabı bilemedi. Doğru cevap: "${correctOptionText}"`,
                createdAt: serverTimestamp(),
                uid: 'system',
                username: 'System'
            };
            transaction.set(doc(messagesRef), systemMessage);
        });
    } catch (error) {
        console.error("Oyun bitirilirken hata:", error);
    }
}


export async function initiateGameInvite(
    roomId: string, 
    host: { uid: string, username: string, photoURL: string | null }, 
    gameType: string,
    gameName: string,
    invitedPlayers: { uid: string, username: string, photoURL: string | null }[]
) {
    const messagesRef = collection(db, "rooms", roomId, "messages");
    const gameInviteMessage = {
        type: 'gameInvite',
        createdAt: serverTimestamp(),
        uid: 'system',
        username: 'System',
        gameInviteData: {
            host,
            gameName,
            gameType,
            invitedPlayers: [host, ...invitedPlayers],
            acceptedPlayers: [host], // Host auto-accepts
            declinedPlayers: [],
            status: 'pending',
        }
    };
    await addDoc(messagesRef, gameInviteMessage);
    return { success: true };
}


export async function respondToGameInvite(
    roomId: string,
    messageId: string,
    player: { uid: string, username: string, photoURL: string | null },
    accepted: boolean
) {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);
    
    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw new Error("Davet mesajı bulunamadı.");
        
        const inviteData = messageDoc.data().gameInviteData;
        if (inviteData.status !== 'pending') throw new Error("Bu davet artık geçerli değil.");
        
        if (accepted) {
            transaction.update(messageRef, {
                'gameInviteData.acceptedPlayers': arrayUnion(player)
            });
        } else {
            transaction.update(messageRef, {
                'gameInviteData.declinedPlayers': arrayUnion(player),
                'gameInviteData.status': 'declined'
            });
        }
    });
}


export async function playGameMove(
    roomId: string,
    gameSessionId: string,
    playerId: string,
    move: string | number
) {
    const gameSessionRef = doc(db, 'rooms', roomId, 'game_sessions', gameSessionId);
    await updateDoc(gameSessionRef, {
        [`moves.${playerId}`]: move
    });
}
