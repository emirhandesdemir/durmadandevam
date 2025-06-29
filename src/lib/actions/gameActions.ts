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
    where,
    setDoc,
    arrayUnion
} from "firebase/firestore";
import type { GameQuestion, GameSettings, ActiveGame, GameInviteData, ActiveGameSession, UserProfile } from "../types";
import { revalidatePath } from "next/cache";

// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
        // Firestore'dan gelen veriyi varsayılanlarla birleştirerek eksik alanları doldur
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
            ...firestoreData
        } as GameSettings;
    }
    // Varsayılan ayarlar
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
    };
}

// Ayarları güncellemek için fonksiyon
export async function updateGameSettings(settings: Partial<GameSettings>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    // Belge yoksa oluşturmak, varsa güncellemek için { merge: true } ile setDoc kullanılır.
    await setDoc(settingsRef, settings, { merge: true });
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


// --- Çok Oyunculu Oyun Akışı ---

export async function initiateGameInvite(
    roomId: string, 
    host: { uid: string, username: string },
    gameType: GameInviteData['gameType'],
    gameName: string,
    invitedPlayers: { uid: string, username: string }[]
) {
    const messagesRef = collection(db, 'rooms', roomId, 'messages');
    
    const inviteData: GameInviteData = {
        host,
        gameType,
        gameName,
        invitedPlayers: [host, ...invitedPlayers], // Host is also a player
        acceptedPlayers: [host], // Host auto-accepts
        declinedPlayers: [],
        status: 'pending'
    };

    await addDoc(messagesRef, {
        type: 'game_invite',
        uid: 'system',
        username: 'System',
        text: `${host.username} bir ${gameName} oyunu başlattı.`,
        createdAt: serverTimestamp(),
        gameInviteData: inviteData
    });

    revalidatePath(`/rooms/${roomId}`);
}

export async function respondToGameInvite(
    roomId: string,
    messageId: string,
    respondingUser: { uid: string, username: string },
    accepted: boolean
) {
    const messageRef = doc(db, 'rooms', roomId, 'messages', messageId);

    await runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists() || !messageDoc.data().gameInviteData) {
            throw new Error("Davet bulunamadı.");
        }

        const inviteData = messageDoc.data().gameInviteData as GameInviteData;

        if (inviteData.status !== 'pending') {
            throw new Error("Bu davet artık geçerli değil.");
        }

        const isAlreadyAccepted = inviteData.acceptedPlayers.some(p => p.uid === respondingUser.uid);
        const isAlreadyDeclined = inviteData.declinedPlayers.some(d => d.uid === respondingUser.uid);
        if (isAlreadyAccepted || isAlreadyDeclined) {
            throw new Error("Bu davete zaten yanıt verdin.");
        }

        let newInviteData: GameInviteData;

        if (accepted) {
            newInviteData = {
                ...inviteData,
                acceptedPlayers: [...inviteData.acceptedPlayers, respondingUser]
            };
        } else {
            newInviteData = {
                ...inviteData,
                declinedPlayers: [...inviteData.declinedPlayers, respondingUser],
                status: 'cancelled' // One person declines, game is cancelled
            };
        }
        
        // Check if all players have accepted
        if (accepted && newInviteData.acceptedPlayers.length === newInviteData.invitedPlayers.length) {
            newInviteData.status = 'accepted'; // Update status to show it's starting
            
            // Create the actual game document
            const gameRef = doc(collection(db, 'rooms', roomId, 'games'), messageId); // use messageId as gameId
            const roomDoc = await transaction.get(doc(db, 'rooms', roomId));
            const roomData = roomDoc.data() as Room;

            // Fetch full player profiles to get photoURL
            const playerUids = newInviteData.acceptedPlayers.map(p => p.uid);
            const usersQuery = query(collection(db, 'users'), where('uid', 'in', playerUids));
            const usersSnapshot = await getDocs(usersQuery);
            const playerProfiles = usersSnapshot.docs.map(d => d.data() as UserProfile);

            const playersForGame = newInviteData.acceptedPlayers.map(p => {
                const profile = playerProfiles.find(prof => prof.uid === p.uid);
                return { ...p, photoURL: profile?.photoURL || null };
            });
            
            const newGameSession: Omit<ActiveGameSession, 'id'> = {
                gameType: newInviteData.gameType,
                gameName: newInviteData.gameName,
                players: playersForGame,
                status: 'active',
                moves: {},
                turn: newInviteData.gameType === 'bottle' ? newInviteData.host.uid : undefined,
                createdAt: serverTimestamp() as Timestamp,
            };
            transaction.set(gameRef, newGameSession);
        }
        
        transaction.update(messageRef, { gameInviteData: newInviteData });
    });
    
    revalidatePath(`/rooms/${roomId}`);
}

async function awardWinner(transaction: any, winnerId: string) {
    const userRef = doc(db, 'users', winnerId);
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const settings = await getGameSettings();
    const today = new Date().toISOString().split('T')[0];
    const dailyEarnings = userData.dailyDiamonds?.[today] || 0;

    if (dailyEarnings < settings.dailyDiamondLimit) {
        transaction.update(userRef, {
            diamonds: increment(1),
            [`dailyDiamonds.${today}`]: increment(1)
        });
    }
}


function getRpsWinner(player1Move: string, player2Move: string): 0 | 1 | -1 { // 0 for player1, 1 for player2, -1 for draw
  if (player1Move === player2Move) return -1;
  if (
    (player1Move === 'rock' && player2Move === 'scissors') ||
    (player1Move === 'scissors' && player2Move === 'paper') ||
    (player1Move === 'paper' && player2Move === 'rock')
  ) {
    return 0;
  }
  return 1;
}


export async function playGameMove(roomId: string, gameId: string, userId: string, move: any) {
    const gameRef = doc(db, 'rooms', roomId, 'games', gameId);
    const roomRef = doc(db, 'rooms', roomId);
    const messagesRef = collection(roomRef, 'messages');

    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Oyun bulunamadı.");

        const gameData = gameDoc.data() as ActiveGameSession;
        if (gameData.status !== 'active') throw new Error("Bu oyun aktif değil.");
        
        const isPlayer = gameData.players.some(p => p.uid === userId);
        if (!isPlayer) throw new Error("Bu oyunun bir parçası değilsiniz.");

        if (gameData.moves[userId]) throw new Error("Zaten bir hamle yaptınız.");

        let newMoves = { ...gameData.moves };
        let gameFinished = false;
        let winnerId: string | null = null;
        let winnerName: string | null = null;
        let systemMessage = '';

        // --- Game Logic ---
        switch (gameData.gameType) {
            case 'dice':
                newMoves[userId] = Math.floor(Math.random() * 6) + 1;
                if (Object.keys(newMoves).length === gameData.players.length) {
                    gameFinished = true;
                    const [player1, player2] = gameData.players;
                    const roll1 = newMoves[player1.uid] as number;
                    const roll2 = newMoves[player2.uid] as number;
                    if (roll1 > roll2) winnerId = player1.uid;
                    else if (roll2 > roll1) winnerId = player2.uid;
                    
                    winnerName = winnerId ? gameData.players.find(p => p.uid === winnerId)?.username || 'Biri' : null;
                    systemMessage = winnerId 
                        ? `🎲 ${winnerName} ${Math.max(roll1, roll2)} atarak kazandı! (${roll1} vs ${roll2})`
                        : `🎲 Berabere! Herkes ${roll1} attı.`;
                }
                break;
            
            case 'rps':
                newMoves[userId] = move; // 'rock', 'paper', 'scissors'
                if (Object.keys(newMoves).length === gameData.players.length) {
                    gameFinished = true;
                    const [player1, player2] = gameData.players;
                    const move1 = newMoves[player1.uid] as string;
                    const move2 = newMoves[player2.uid] as string;
                    const winnerIndex = getRpsWinner(move1, move2);

                    if(winnerIndex !== -1) {
                        winnerId = gameData.players[winnerIndex].uid;
                        winnerName = gameData.players[winnerIndex].username;
                    }
                    systemMessage = winnerId
                        ? `✂️ ${winnerName} kazandı! (${move1} vs ${move2})`
                        : `✂️ Berabere! Herkes ${move1} seçti.`;
                }
                break;

            case 'bottle':
                 if (userId !== gameData.players.find(p => p.uid === gameData.turn)?.uid) throw new Error("Sıra sende değil.");
                 gameFinished = true;
                 const targetPlayer = gameData.players.find(p => p.uid !== userId)!;
                 systemMessage = `🍾 Şişe ${targetPlayer.username} adlı kişiyi gösterdi!`;
                 // No winner/reward for bottle game
                break;
        }

        // Update moves
        transaction.update(gameRef, { moves: newMoves });

        // If game is finished, update status and announce
        if (gameFinished) {
            transaction.update(gameRef, { status: 'finished', winnerId: winnerId, finishedAt: serverTimestamp() });
            
            if(winnerId) {
                await awardWinner(transaction, winnerId);
            }

            const messageDocRef = doc(messagesRef);
            transaction.set(messageDocRef, {
                type: 'game', text: systemMessage, uid: 'system', username: 'Oyun', createdAt: serverTimestamp()
            });
        }
    });

    revalidatePath(`/rooms/${roomId}`);
}


// --- Quiz Oyunu Mekanikleri ---

/**
 * Bir odada yeni bir quiz oyunu başlatır.
 * Rastgele bir soru seçer ve oda için bir oyun dokümanı oluşturur.
 * @param roomId Oyunun başlatılacağı odanın ID'si.
 */
export async function startGameInRoom(roomId: string) {
    const roomRef = doc(db, 'rooms', roomId);
    
    // Aktif bir oyun olup olmadığını son bir kez kontrol et
    const activeGamesQuery = query(collection(roomRef, 'games'), where('status', '==', 'active'), limit(1));
    const activeGamesSnapshot = await getDocs(activeGamesQuery);
    if (!activeGamesSnapshot.empty) {
        console.warn("Zaten aktif bir oyun var, yeni oyun başlatılamadı.");
        return { success: false, error: "Zaten aktif bir oyun var."};
    }

    // 1. Rastgele bir soru seç
    const questionsRef = collection(db, 'game_questions');
    const questionsSnapshot = await getDocs(questionsRef);
    if (questionsSnapshot.empty) {
        console.warn("Oyun başlatılamadı: Hiç soru bulunmuyor.");
        return { success: false, error: "Hiç soru bulunmuyor."};
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

            // Önce herkes için cevap verdiğini işaretle
            transaction.update(gameRef, { answeredBy: arrayUnion(userId) });
            
            // Cevap doğru mu?
            if (gameData.correctOptionIndex === answerIndex) {
                // Oyunu bitir ve kazananı işaretle
                transaction.update(gameRef, { status: 'finished', winner: userId });
                // Bir sonraki oyun için zamanlayıcıyı ayarla
                await setNextGameTime(transaction, roomRef);

                // Ayarları ve ödülü al
                const settings = await getGameSettings();
                const reward = settings.rewardAmount;
                const dailyLimit = settings.dailyDiamondLimit;

                // Günlük limiti kontrol et
                const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const dailyEarnings = userData.dailyDiamonds?.[today] || 0;

                let messageText = `🎉 ${userData.username} doğru cevap verdi!`;

                if (dailyEarnings < dailyLimit) {
                     // Ödülü ver
                    transaction.update(userRef, {
                        diamonds: increment(reward),
                        [`dailyDiamonds.${today}`]: increment(reward)
                    });
                    messageText = `🎉 ${userData.username} doğru cevap verdi ve ${reward} elmas kazandı!`;
                } else {
                    messageText = `🎉 ${userData.username} doğru cevap verdi ancak günlük ödül limitine ulaştı!`;
                }

                // Sistem mesajını gönder
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
            const correctOptionText = gameData.options[gameData.correctOptionIndex];

            // Oyunu bitir
            transaction.update(gameRef, { status: 'finished' });
            
            // Bir sonraki oyun için zamanlayıcıyı ayarla
            await setNextGameTime(transaction, roomRef);


            // Sistem mesajı gönder
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
