// src/lib/actions/gameActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    doc, 
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
    writeBatch,
    arrayUnion,
    setDoc
} from "firebase/firestore";
import type { GameSettings, ActiveGame, Room, UserProfile, ActiveGameSession } from "../types";
import { revalidatePath } from "next/cache";
import { generateQuizQuestions } from '@/ai/flows/generateQuizQuestionFlow';
import { addSystemMessage } from "./roomActions";

export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    const defaults: GameSettings = {
        gameIntervalMinutes: 5,
        questionTimerSeconds: 20,
        rewardAmount: 10,
        cooldownSeconds: 30,
        afkTimeoutMinutes: 8,
        imageUploadQuality: 0.9,
        audioBitrate: 64,
        videoBitrate: 1000,
    };
    if (docSnap.exists()) {
        return { ...defaults, ...docSnap.data() } as GameSettings;
    }
    return defaults;
}

export async function updateGameSettings(settings: Partial<Omit<GameSettings, 'dailyDiamondLimit'>>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    await setDoc(settingsRef, settings, { merge: true });
    revalidatePath('/admin/system');
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
        answeredBy: [],
    };
    await addDoc(gamesRef, newGameData);
    
    await addSystemMessage(roomId, "⏳ Quiz oyunu 1 dakika içinde başlıyor!");

    revalidatePath(`/rooms/${roomId}`);
    return { success: true };
}


export async function generateQuestionsForGame(roomId: string, gameId: string) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);
    
    try {
        // Run as a transaction to prevent race conditions
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists() || gameDoc.data().status !== 'countdown') {
                // Game has already been started by another client or cancelled.
                return;
            }

            const questions = await generateQuizQuestions();
            
            transaction.update(gameRef, {
                questions: questions,
                status: 'active',
                startTime: serverTimestamp(),
            });
        });
        
        await addSystemMessage(roomId, "Oyun başladı! İlk soru geliyor...");
        revalidatePath(`/rooms/${roomId}`);
    } catch (error) {
        console.error(`[Game ID: ${roomId}] Failed to generate questions:`, error);
        await updateDoc(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
        await addSystemMessage(roomId, "Hata nedeniyle oyun başlatılamadı.");
        revalidatePath(`/rooms/${roomId}`);
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
        if (gameData.answeredBy?.includes(userId)) {
            throw new Error("Bu soruya zaten cevap verdin.");
        }

        const currentQuestion = gameData.questions[questionIndex];
        const isCorrect = currentQuestion.correctOptionIndex === answerIndex;

        const updates: { [key: string]: any } = {
             answeredBy: arrayUnion(userId)
        };

        if (isCorrect) {
            const scorePath = `scores.${userId}`;
            updates[scorePath] = increment(1);
        }

        transaction.update(gameRef, updates);
    });
}

async function endGame(transaction: any, gameRef: any, roomRef: any, gameData: ActiveGame) {
    const scores = gameData.scores || {};
    
    // Find all unique participants
    const allParticipants = new Set<string>(gameData.answeredBy || []);
    Object.keys(scores).forEach(uid => allParticipants.add(uid));


    const maxScore = Math.max(0, ...Object.values(scores));
    const winnersData: ActiveGame['winners'] = [];
    const winnerUids = new Set<string>();
    
    const rewards = [5, 10, 15]; // 1, 2, 3 correct answers
    let winnerMessage = "Kimse doğru cevap veremedi!";

    if (maxScore > 0) {
        const winnerIdList = Object.keys(scores).filter(uid => scores[uid] === maxScore);
        
        const userDocsPromises = winnerIdList.map(uid => transaction.get(doc(db, 'users', uid)));
        const userDocs = await Promise.all(userDocsPromises);
        
        const reward = rewards[maxScore - 1] || 15; 

        for (let i=0; i < userDocs.length; i++) {
            const userDoc = userDocs[i];
            if (userDoc.exists()) {
                const userData = userDoc.data() as UserProfile;
                const winnerUid = winnerIdList[i];
                winnerUids.add(winnerUid);
                winnersData.push({
                    uid: winnerUid,
                    username: userData.username,
                    photoURL: userData.photoURL || null,
                    score: maxScore,
                    reward: reward,
                });
                transaction.update(userDoc.ref, { diamonds: increment(reward) });
            }
        }
        if (winnersData.length > 0) {
             winnerMessage = `Kazanan(lar): ${winnersData.map(w => `@${w.username}`).join(', ')} - ${reward} elmas kazandılar! 🏆`;
        }
    }
    
    // Give consolation prize
    const consolationPrize = 3;
    for (const participantId of allParticipants) {
        if (!winnerUids.has(participantId)) { 
            const userRef = doc(db, 'users', participantId);
            transaction.update(userRef, { diamonds: increment(consolationPrize) });
        }
    }

    transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp(), winners: winnersData });
    
    await addSystemMessage(roomRef.id, `Oyun bitti! ${winnerMessage}`);
    revalidatePath(`/rooms/${roomRef.id}`);
}

export async function advanceToNextQuestion(roomId: string, gameId: string) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);
    const roomRef = doc(db, 'rooms', roomId);

    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;

        const gameData = gameDoc.data() as ActiveGame;
        const nextQuestionIndex = gameData.currentQuestionIndex + 1;

        if (nextQuestionIndex >= gameData.questions.length) {
            await endGame(transaction, gameRef, roomRef, gameData);
        } else {
            transaction.update(gameRef, {
                currentQuestionIndex: nextQuestionIndex,
                answeredBy: [],
                startTime: serverTimestamp()
            });
            await addSystemMessage(roomId, `Sıradaki soru geliyor...`);
        }
    });
}


export async function endGameWithoutWinner(roomId: string, gameId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(roomRef, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;
        
        transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
        await addSystemMessage(roomId, 'Süre doldu! Doğru cevap verilemedi.');
    });
    revalidatePath(`/rooms/${roomId}`);
}

export async function initiateGameInvite(
    roomId: string, 
    host: { uid: string, username: string, photoURL: string | null }, 
    gameType: string,
    gameName: string,
    invitedPlayers: { uid: string, username: string, photoURL: string | null }[]
) {
    // ... logic remains the same
}

export async function respondToGameInvite(
    roomId: string,
    messageId: string,
    player: { uid: string, username: string, photoURL: string | null },
    accepted: boolean
) {
    // ... logic remains the same
}


export async function playGameMove(
    roomId: string,
    gameSessionId: string,
    playerId: string,
    move: string | number
) {
    // ... logic remains the same
}
