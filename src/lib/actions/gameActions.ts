// src/lib/actions/gameActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    doc, 
    setDoc,
    getDoc,
    collection,
    addDoc,
    runTransaction,
    updateDoc,
    serverTimestamp,
    query,
    where,
    limit,
    getDocs,
    Timestamp,
    increment,
    writeBatch
} from "firebase/firestore";
import type { GameSettings, ActiveGame, Room, QuizQuestion } from "../types";
import { revalidatePath } from "next/cache";
import { generateQuizQuestion } from '@/ai/flows/generateQuizQuestionFlow';

// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    const defaults: GameSettings = {
        gameIntervalMinutes: 5,
        questionTimerSeconds: 20,
        rewardAmount: 10, // Base reward for a full game
        cooldownSeconds: 30,
        afkTimeoutMinutes: 8,
        imageUploadQuality: 0.9,
        audioBitrate: 64,
        videoBitrate: 1000,
    };
    if (docSnap.exists()) {
        return { ...defaults, ...docSnap.data() };
    }
    return defaults;
}

export async function startGameInRoom(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    
    const activeGamesQuery = query(collection(roomRef, 'games'), where('status', 'in', ['countdown', 'active']), limit(1));
    const activeGamesSnapshot = await getDocs(activeGamesQuery);
    if (!activeGamesSnapshot.empty) {
        throw new Error("Zaten aktif bir oyun veya geri sayım var.");
    }
    
    const gamesRef = collection(roomRef, 'games');
    const newGameData: Partial<ActiveGame> = {
        status: 'countdown',
        countdownStartTime: serverTimestamp() as Timestamp,
        questions: [],
        currentQuestionIndex: 0,
        scores: {},
        answeredBy: {},
    };
    await addDoc(gamesRef, newGameData);
    
    await addDoc(collection(roomRef, 'messages'), {
        type: 'game',
        text: `⏳ Quiz oyunu 1 dakika içinde başlıyor!`,
        createdAt: serverTimestamp(),
        uid: 'system',
        username: 'System'
    });

    // Schedule question generation
    // In a real app, this would be a scheduled Cloud Function or a robust queueing system.
    // For this demo, we'll simulate it with a delay.
    setTimeout(async () => {
        try {
            await generateQuestionsForGame(roomId);
        } catch (error) {
            console.error(`[Game ID: ${roomId}] Failed to generate questions:`, error);
            // Optionally, cancel the game
        }
    }, 60 * 1000); // 1 minute

    revalidatePath(`/rooms/${roomId}`);
    return { success: true };
}


async function generateQuestionsForGame(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const gamesQuery = query(collection(roomRef, 'games'), where('status', '==', 'countdown'), limit(1));
    const gamesSnapshot = await getDocs(gamesQuery);

    if (gamesSnapshot.empty) {
        console.log("Geri sayım yapan oyun bulunamadı, soru üretme iptal edildi.");
        return;
    }

    const gameDoc = gamesSnapshot.docs[0];
    const gameRef = gameDoc.ref;

    try {
        const questions: QuizQuestion[] = [];
        for (let i = 0; i < 3; i++) {
            const questionData = await generateQuizQuestion({});
            questions.push(questionData);
        }

        await updateDoc(gameRef, {
            questions: questions,
            status: 'active',
            startTime: serverTimestamp(),
        });
        
        await addDoc(collection(roomRef, 'messages'), {
            type: 'game',
            text: `Oyun başladı! İlk soru geliyor...`,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System'
        });

    } catch (error) {
        console.error("AI soru üretirken hata:", error);
        await updateDoc(gameRef, { status: 'finished' });
        await addDoc(collection(roomRef, 'messages'), {
            type: 'game',
            text: `Üzgünüz, bir hata nedeniyle oyun başlatılamadı.`,
            createdAt: serverTimestamp(),
            uid: 'system',
            username: 'System'
        });
    }
}

export async function submitAnswer(roomId: string, gameId: string, userId: string, answerIndex: number) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);

    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Oyun bulunamadı.");

        const gameData = gameDoc.data() as ActiveGame;
        if (gameData.status !== 'active') throw new Error("Oyun aktif değil.");
        
        const questionIndex = gameData.currentQuestionIndex;
        if (gameData.answeredBy[questionIndex]?.includes(userId)) {
            throw new Error("Bu soruya zaten cevap verdin.");
        }

        const currentQuestion = gameData.questions[questionIndex];
        const isCorrect = currentQuestion.correctOptionIndex === answerIndex;

        const updates: { [key: string]: any } = {};
        updates[`answeredBy.${questionIndex}`] = arrayUnion(userId);

        if (isCorrect) {
            updates[`scores.${userId}`] = increment(1);
        }

        transaction.update(gameRef, updates);
    });
}

export async function endGame(roomId: string, gameId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(db, 'rooms', gameId);
    
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;
        
        const gameData = gameDoc.data() as ActiveGame;
        const scores = gameData.scores || {};
        
        const maxScore = Math.max(0, ...Object.values(scores));
        const winnersData: ActiveGame['winners'] = [];
        
        if (maxScore > 0) {
            const winnerUids = Object.keys(scores).filter(uid => scores[uid] === maxScore);
            const userDocs = await Promise.all(winnerUids.map(uid => transaction.get(doc(db, 'users', uid))));
            
            const rewards = [5, 10, 15];
            const reward = rewards[maxScore - 1] || 15;

            userDocs.forEach((userDoc, index) => {
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const winnerUid = winnerUids[index];
                    winnersData.push({
                        uid: winnerUid,
                        username: userData.username,
                        photoURL: userData.photoURL || null,
                        score: maxScore,
                        reward: reward,
                    });
                    transaction.update(userDoc.ref, { diamonds: increment(reward) });
                }
            });
        }
        
        transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp(), winners: winnersData });
        
        const settings = await getGameSettings();
        const intervalMillis = settings.gameIntervalMinutes * 60 * 1000;
        transaction.update(roomRef, { nextGameTimestamp: Timestamp.fromMillis(Date.now() + intervalMillis) });
    });
}


export async function endGameWithoutWinner(roomId: string, gameId: string) {
     const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(roomRef, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;

        transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
        const settings = await getGameSettings();
        const intervalMillis = settings.gameIntervalMinutes * 60 * 1000;
        transaction.update(roomRef, { nextGameTimestamp: Timestamp.fromMillis(Date.now() + intervalMillis) });
    });
}
