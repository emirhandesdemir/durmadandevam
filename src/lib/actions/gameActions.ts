// src/lib/actions/gameActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    serverTimestamp,
    getDoc,
    getDocs,
    writeBatch,
    runTransaction,
    query,
    limit,
    Timestamp,
    increment,
    where
} from "firebase/firestore";
import type { GameQuestion, GameSettings, ActiveGame } from "../types";
import { revalidatePath } from "next/cache";

// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        return docSnap.data() as GameSettings;
    }
    // Varsayılan ayarlar
    return {
        dailyDiamondLimit: 50,
        gameIntervalMinutes: 5,
        questionTimerSeconds: 15,
        rewardAmount: 5,
        cooldownSeconds: 30,
    };
}

// Ayarları güncellemek için fonksiyon
export async function updateGameSettings(settings: Partial<GameSettings>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    await updateDoc(settingsRef, settings, { merge: true });
    revalidatePath('/admin/system');
}

// --- Soru CRUD İşlemleri ---

export async function addQuestion(data: Omit<GameQuestion, 'id' | 'createdAt'>) {
    const questionsRef = collection(db, 'game_questions');
    await addDoc(questionsRef, {
        ...data,
        createdAt: serverTimestamp(),
    });
    revalidatePath('/admin/questions');
}

export async function updateQuestion(id: string, data: Partial<Omit<GameQuestion, 'id' | 'createdAt'>>) {
    const questionRef = doc(db, 'game_questions', id);
    await updateDoc(questionRef, data);
    revalidatePath('/admin/questions');
}

export async function deleteQuestion(id: string) {
    const questionRef = doc(db, 'game_questions', id);
    await deleteDoc(questionRef);
    revalidatePath('/admin/questions');
}


// --- Oyun Mekanikleri ---

/**
 * Bir odada yeni bir quiz oyunu başlatır.
 * Rastgele bir soru seçer ve oda için bir oyun dokümanı oluşturur.
 * @param roomId Oyunun başlatılacağı odanın ID'si.
 */
export async function startGameInRoom(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    
    // 1. Rastgele bir soru seç
    const questionsRef = collection(db, 'game_questions');
    const questionsSnapshot = await getDocs(questionsRef);
    if (questionsSnapshot.empty) {
        console.warn("Oyun başlatılamadı: Hiç soru bulunmuyor.");
        return;
    }
    const allQuestions = questionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GameQuestion));
    const randomQuestion = allQuestions[Math.floor(Math.random() * allQuestions.length)];

    // 2. Yeni oyun dokümanını oluştur
    const gamesRef = collection(roomRef, 'games');
    const newGame = {
        questionId: randomQuestion.id,
        question: randomQuestion.question,
        options: randomQuestion.options,
        correctOptionIndex: randomQuestion.correctOptionIndex,
        startTime: serverTimestamp(),
        status: 'active', // 'active', 'finished'
        answeredBy: [], // Cevap verenlerin UID'lerini tutar
    };
    await addDoc(gamesRef, newGame);
}


/**
 * Bir kullanıcının oyun cevabını işler.
 * @param roomId Oda ID'si
 * @param gameId Oyun ID'si
 * @param userId Cevap veren kullanıcı ID'si
 * @param answerIndex Kullanıcının cevabının indeksi (0-3)
 */
export async function submitAnswer(roomId: string, gameId: string, userId: string, answerIndex: number) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);
    const userRef = doc(db, 'users', userId);
    const messagesRef = collection(db, 'rooms', roomId, 'messages');

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

            // Önce herkes için cevap verdiğini işaretle
            transaction.update(gameRef, { answeredBy: arrayUnion(userId) });
            
            // Cevap doğru mu?
            if (gameData.correctOptionIndex === answerIndex) {
                // Ayarları ve ödülü al
                const settings = await getGameSettings();
                const reward = settings.rewardAmount;
                const dailyLimit = settings.dailyDiamondLimit;

                // Günlük limiti kontrol et
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dailyEarnings = userData.dailyDiamonds?.[today] || 0;

                if (dailyEarnings >= dailyLimit) {
                    // Limite ulaşıldı, sadece tebrik mesajı gönder
                    const systemMessage = {
                        type: 'game', text: `🎉 ${userData.username} doğru cevap verdi ancak günlük ödül limitine ulaştı!`,
                        createdAt: serverTimestamp(), uid: 'system', username: 'System',
                    };
                    transaction.set(doc(messagesRef), systemMessage);
                     transaction.update(gameRef, { status: 'finished' });
                    return;
                }
                
                // Ödülü ver ve oyunu bitir
                transaction.update(userRef, {
                    diamonds: increment(reward),
                    [`dailyDiamonds.${today}`]: increment(reward)
                });

                transaction.update(gameRef, { status: 'finished', winner: userId });

                const systemMessage = {
                    type: 'game', text: `🎉 ${userData.username} doğru cevap verdi ve ${reward} elmas kazandı!`,
                    createdAt: serverTimestamp(), uid: 'system', username: 'System',
                };
                transaction.set(doc(messagesRef), systemMessage);
            }
        });
    } catch (e: any) {
        console.error("Cevap işlenirken hata:", e);
        // Hataları kullanıcıya bildirmek için `throw e;` kullanılabilir.
        // Bu, istemci tarafında yakalanıp toast ile gösterilebilir.
        throw e;
    }
}
