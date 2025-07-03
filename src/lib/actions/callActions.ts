// src/lib/actions/callActions.ts
'use server';

import { db } from '@/lib/firebase';
import {
  doc,
  collection,
  addDoc,
  updateDoc,
  serverTimestamp,
  setDoc,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { createNotification } from './notificationActions';
import { addCallSystemMessageToDm } from './dmActions';
import { getChatId } from '../utils';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function initiateCall(caller: UserInfo, receiver: UserInfo, type: 'video' | 'audio') {
  const callsRef = collection(db, 'calls');
  const newCallRef = doc(callsRef);

  // Set the initial video status based on the call type
  const initialVideoStatus = {
    [caller.uid]: type === 'video',
    [receiver.uid]: false, // Receiver always starts with video off
  };

  await setDoc(newCallRef, {
    callerId: caller.uid,
    callerInfo: {
      username: caller.username,
      photoURL: caller.photoURL,
    },
    receiverId: receiver.uid,
    receiverInfo: {
      username: receiver.username,
      photoURL: receiver.photoURL,
    },
    status: 'ringing',
    type: type,
    videoStatus: initialVideoStatus,
    createdAt: serverTimestamp(),
  });

  await createNotification({
    recipientId: receiver.uid,
    senderId: caller.uid,
    senderUsername: caller.username,
    senderAvatar: caller.photoURL,
    type: 'call_incoming',
    callId: newCallRef.id,
    callType: type,
  });

  return newCallRef.id;
}

export async function updateVideoStatus(callId: string, userId: string, isEnabled: boolean) {
  const callRef = doc(db, 'calls', callId);
  await updateDoc(callRef, {
    [`videoStatus.${userId}`]: isEnabled,
  });
}


export async function updateCallStatus(callId: string, status: 'declined' | 'ended' | 'missed' | 'active') {
    const callRef = doc(db, 'calls', callId);
    const updateData: { status: string; [key: string]: any } = { status };
    let shouldAddDmMessage = false;
    let duration: string | undefined;

    const callSnap = await getDoc(callRef);
    if (!callSnap.exists()) return;
    const callData = callSnap.data();
    
    if(status !== 'active') {
        updateData.endedAt = serverTimestamp();
        shouldAddDmMessage = true;
        if(status === 'ended' && callData.startedAt) {
            const startTime = (callData.startedAt as Timestamp).toMillis();
            const endTime = Date.now();
            const durationSeconds = Math.round((endTime - startTime) / 1000);
            const minutes = Math.floor(durationSeconds / 60);
            const seconds = durationSeconds % 60;
            duration = `${minutes} dakika ${seconds} saniye`;
        }
    } else {
        updateData.startedAt = serverTimestamp();
    }
    
    await updateDoc(callRef, updateData);

    if (shouldAddDmMessage) {
        const chatId = getChatId(callData.callerId, callData.receiverId);
        await addCallSystemMessageToDm(chatId, status, duration);
    }
    
    // Send a missed call notification to the original caller if the receiver misses it
    if (status === 'missed') {
         await createNotification({
            recipientId: callData.callerId,
            senderId: callData.receiverId,
            senderUsername: callData.receiverInfo.username,
            senderAvatar: callData.receiverInfo.photoURL,
            type: 'call_missed',
            callId: callId,
            callType: callData.type,
        });
    }
}

// For WebRTC signaling
export async function sendOffer(callId: string, offer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { offer: offer });
}

export async function sendAnswer(callId: string, answer: RTCSessionDescriptionInit) {
    const callRef = doc(db, 'calls', callId);
    await updateDoc(callRef, { answer: answer, status: 'active', startedAt: serverTimestamp() });
}

export async function sendIceCandidate(callId: string, candidate: RTCIceCandidateInit, targetId: string) {
    const candidatesCol = collection(db, 'calls', callId, `${targetId}Candidates`);
    await addDoc(candidatesCol, candidate);
}
