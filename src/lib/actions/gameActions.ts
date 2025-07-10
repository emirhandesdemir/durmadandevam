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
    arrayUnion,
    serverTimestamp,
    query,
    where,
    limit,
    getDocs,
    Timestamp,
    increment,
} from "firebase/firestore";
import type { GameSettings, ActiveGameSession } from "../types";
import { revalidatePath } from "next/cache";

// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    const defaults: GameSettings = {
        dailyDiamondLimit: 50,
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

// Ayarları güncellemek için fonksiyon
export async function updateGameSettings(settings: Partial<GameSettings>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    await setDoc(settingsRef, settings, { merge: true });
    revalidatePath('/admin/system');
}

// ---- INTERACTIVE GAMES ----

// A generic function to create an interactive game session document.
async function createGameSession(roomId: string, hostId: string, gameType: 'dice' | 'rps' | 'bottle', gameName: string, players: {uid: string, username: string, photoURL: string|null}[]) {
  const gameSessionsRef = collection(db, 'rooms', roomId, 'game_sessions');
  
  const newSession: Omit<ActiveGameSession, 'id'> = {
    gameType,
    gameName,
    hostId,
    players,
    moves: {},
    status: 'active',
    turn: gameType === 'bottle' ? hostId : undefined,
    createdAt: serverTimestamp() as Timestamp,
  };
  
  const docRef = await addDoc(gameSessionsRef, newSession);
  
  await addDoc(collection(db, 'rooms', roomId, 'messages'), {
    type: 'game',
    text: `${gameName} oyunu başladı!`,
    createdAt: serverTimestamp(),
  });
  
  return docRef.id;
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

    return runTransaction(db, async (transaction) => {
        const messageDoc = await transaction.get(messageRef);
        if (!messageDoc.exists()) throw new Error("Davet mesajı bulunamadı.");
        
        const inviteData = messageDoc.data().gameInviteData;
        if (inviteData.status !== 'pending') throw new Error("Bu davet artık geçerli değil.");
        
        let newAcceptedPlayers = [...inviteData.acceptedPlayers];
        let newDeclinedPlayers = [...inviteData.declinedPlayers];
        let newStatus = inviteData.status;

        if (accepted) {
            newAcceptedPlayers.push(player);
        } else {
            newDeclinedPlayers.push(player);
            newStatus = 'declined';
        }

        const allInvitedResponded = newAcceptedPlayers.length + newDeclinedPlayers.length === inviteData.invitedPlayers.length;

        if (allInvitedResponded && newDeclinedPlayers.length === 0) {
            newStatus = 'accepted';
            await createGameSession(roomId, inviteData.host.uid, inviteData.gameType, inviteData.gameName, newAcceptedPlayers);
        }

        transaction.update(messageRef, {
            'gameInviteData.acceptedPlayers': newAcceptedPlayers,
            'gameInviteData.declinedPlayers': newDeclinedPlayers,
            'gameInviteData.status': newStatus,
        });
    });
}


export async function playGameMove(
    roomId: string,
    gameSessionId: string,
    playerId: string,
    move: string | number
) {
    const gameSessionRef = doc(db, 'rooms', roomId, 'game_sessions', gameSessionId);
    
    return runTransaction(db, async (transaction) => {
        const sessionDoc = await transaction.get(gameSessionRef);
        if (!sessionDoc.exists()) throw new Error("Oyun oturumu bulunamadı.");

        const sessionData = sessionDoc.data() as ActiveGameSession;
        if (sessionData.moves[playerId]) throw new Error("Zaten hamle yaptın.");

        const newMoves = { ...sessionData.moves, [playerId]: move };
        transaction.update(gameSessionRef, { moves: newMoves });
        
        // --- Game Logic ---
        if (Object.keys(newMoves).length === sessionData.players.length) {
            let winnerId: string | null = null;
            let resultMessage: string;

            if (sessionData.gameType === 'dice') {
                const p1_roll = newMoves[sessionData.players[0].uid] as number;
                const p2_roll = newMoves[sessionData.players[1].uid] as number;
                if (p1_roll > p2_roll) winnerId = sessionData.players[0].uid;
                else if (p2_roll > p1_roll) winnerId = sessionData.players[1].uid;
            } else if (sessionData.gameType === 'rps') {
                const p1_move = newMoves[sessionData.players[0].uid] as string;
                const p2_move = newMoves[sessionData.players[1].uid] as string;
                if ( (p1_move === 'rock' && p2_move === 'scissors') || (p1_move === 'paper' && p2_move === 'rock') || (p1_move === 'scissors' && p2_move === 'paper')) {
                    winnerId = sessionData.players[0].uid;
                } else if (p1_move !== p2_move) {
                    winnerId = sessionData.players[1].uid;
                }
            } else if (sessionData.gameType === 'bottle') {
                const nonHostPlayers = sessionData.players.filter(p => p.uid !== sessionData.hostId);
                winnerId = nonHostPlayers[Math.floor(Math.random() * nonHostPlayers.length)].uid;
            }
            
            const winnerInfo = winnerId ? sessionData.players.find(p => p.uid === winnerId) : null;
            resultMessage = winnerInfo ? `🎉 ${winnerInfo.username} kazandı!` : 'Oyun berabere bitti!';
            if(sessionData.gameType === 'bottle') resultMessage = `🍾 Şişe ${winnerInfo?.username}'i gösterdi!`
            
            transaction.update(gameSessionRef, { status: 'finished', winnerId });
            await addDoc(collection(db, 'rooms', roomId, 'messages'), {
                type: 'game', text: resultMessage, createdAt: serverTimestamp(),
            });
        }
    });
}
