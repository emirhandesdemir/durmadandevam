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
    writeBatch,
    arrayUnion
} from "firebase/firestore";
import type { GameSettings, ActiveGame, Room, UserProfile } from "../types";
import { revalidatePath } from "next/cache";
import { generateQuizQuestions } from '@/ai/flows/generateQuizQuestionFlow';
import { addSystemMessage } from "./roomActions";

// Ayarları almak için fonksiyon
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
    
    // Create the game document first with a 'countdown' status
    const gamesRef = collection(roomRef, 'games');
    const newGameData: Partial<ActiveGame> = {
        status: 'countdown',
        countdownStartTime: serverTimestamp() as Timestamp,
        questions: [],
        currentQuestionIndex: 0,
        scores: {},
        answeredBy: {},
    };
    const newGameRef = await addDoc(gamesRef, newGameData);

    // Announce the countdown
    await addSystemMessage(roomId, "⏳ Quiz oyunu 1 dakika içinde başlıyor!");

    // After 1 minute, generate questions and start the game
    setTimeout(async () => {
        try {
            const questions = await generateQuizQuestions();
            const gameRef = doc(db, 'rooms', roomId, 'games', newGameRef.id);
            
            await updateDoc(gameRef, {
                questions: questions,
                status: 'active',
                startTime: serverTimestamp(),
            });
            
            await addSystemMessage(roomId, "Oyun başladı! İlk soru geliyor...");

        } catch (error) {
            console.error(`[Game ID: ${roomId}] Failed to generate questions and start game:`, error);
            const gameRef = doc(db, 'rooms', roomId, 'games', newGameRef.id);
            await updateDoc(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
             await addSystemMessage(roomId, "Hata nedeniyle oyun başlatılamadı.");
        }
    }, 60 * 1000); 

    revalidatePath(`/rooms/${roomId}`);
    return { success: true };
}

export async function submitAnswer(roomId: string, gameId: string, userId: string, answerIndex: number) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);

    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Oyun bulunamadı.");

        const gameData = gameDoc.data() as ActiveGame;
        if (gameData.status !== 'active') throw new Error("Oyun aktif değil.");
        
        const questionIndex = gameData.currentQuestionIndex;
        if ((gameData.answeredBy || {})[questionIndex]?.includes(userId)) {
            throw new Error("Bu soruya zaten cevap verdin.");
        }

        const currentQuestion = gameData.questions[questionIndex];
        const isCorrect = currentQuestion.correctOptionIndex === answerIndex;

        const updates: { [key: string]: any } = {};
        const answeredByPath = `answeredBy.${questionIndex}`;
        updates[answeredByPath] = arrayUnion(userId);

        if (isCorrect) {
            const scorePath = `scores.${userId}`;
            updates[scorePath] = increment(1);
        }

        transaction.update(gameRef, updates);
    });
}

export async function endGame(roomId: string, gameId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;
        
        const gameData = gameDoc.data() as ActiveGame;
        const scores = gameData.scores || {};
        const answeredBy = gameData.answeredBy || {};
        
        const allParticipants = new Set<string>();
        Object.values(answeredBy).forEach(uids => {
            uids.forEach(uid => allParticipants.add(uid));
        });

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

            userDocs.forEach((userDoc, index) => {
                if (userDoc.exists()) {
                    const userData = userDoc.data() as UserProfile;
                    const winnerUid = winnerIdList[index];
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
            });

            if (winnersData.length > 0) {
                 winnerMessage = `Kazanan(lar): ${winnersData.map(w => `@${w.username}`).join(', ')} - ${reward} elmas kazandılar! 🏆`;
            }
        }
        
        const consolationPrize = 3;
        const participantUpdatePromises: Promise<void>[] = [];
        allParticipants.forEach(participantId => {
            if (!winnerUids.has(participantId)) { 
                const userRef = doc(db, 'users', participantId);
                participantUpdatePromises.push(Promise.resolve(transaction.update(userRef, { diamonds: increment(consolationPrize) })));
            }
        });
        await Promise.all(participantUpdatePromises);


        transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp(), winners: winnersData });
        
        await addSystemMessage(roomId, `Oyun bitti! ${winnerMessage}`);
    });
}

export async function endGameWithoutWinner(roomId: string, gameId: string) {
     const roomRef = doc(db, 'rooms', roomId);
    const gameRef = doc(roomRef, 'games', gameId);
    
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists() || gameDoc.data().status !== 'active') return;
        const gameData = gameDoc.data();
        
        const answeredBy = gameData.answeredBy || {};
        const allParticipants = new Set<string>();
        Object.values(answeredBy).forEach((uids: any) => {
            uids.forEach((uid: string) => allParticipants.add(uid));
        });

        const consolationPrize = 3;
        for (const participantId of allParticipants) {
             const userRef = doc(db, 'users', participantId);
             transaction.update(userRef, { diamonds: increment(consolationPrize) });
        }
        
        const message = allParticipants.size > 0 
            ? 'Süre doldu! Katılan herkes teselli ödülü olarak 3 elmas kazandı! 🥳'
            : 'Süre doldu! Kimse katılmadı.';

        transaction.update(gameRef, { status: 'finished', finishedAt: serverTimestamp() });
        await addSystemMessage(roomId, message);
    });
}
