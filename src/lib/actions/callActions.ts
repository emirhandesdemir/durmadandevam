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
} from 'firebase/firestore';
import { createNotification } from './notificationActions';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
}

export async function initiateCall(caller: UserInfo, receiver: UserInfo, type: 'video' | 'audio') {
  const callsRef = collection(db, 'calls');
  const newCallRef = doc(callsRef);

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
    videoStatus: {
        [caller.uid]: type === 'video',
        [receiver.uid]: type === 'video',
    },
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
    if(status !== 'active') {
        updateData.endedAt = serverTimestamp();
    } else {
        updateData.startedAt = serverTimestamp();
    }
    await updateDoc(callRef, updateData);
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

export async function sendIceCandidate(callId: string, candidate: RTCIceCandidateInit, target: 'caller' | 'receiver') {
    const candidatesCol = collection(db, 'calls', callId, `${target}Candidates`);
    await addDoc(candidatesCol, candidate);
}
