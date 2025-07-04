// src/components/common/IncomingCallManager.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Call } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { updateCallStatus } from '@/lib/actions/callActions';

export default function IncomingCallManager() {
  const { user } = useAuth();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);
  const ringtoneRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!user) return;
    
    // Automatically mark calls as missed if they ring for too long.
    const checkMissedCalls = () => {
        const thirtySecondsAgo = Timestamp.fromMillis(Date.now() - 30000);
        const missedCallQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', user.uid),
            where('status', '==', 'ringing'),
            where('createdAt', '<', thirtySecondsAgo)
        );

        onSnapshot(missedCallQuery, (snapshot) => {
            snapshot.forEach(async (doc) => {
                // Check again to avoid race conditions
                if (doc.data().status === 'ringing') {
                    await updateCallStatus(doc.id, 'missed');
                }
            });
        });
    };

    const intervalId = setInterval(checkMissedCalls, 10000); // Check every 10 seconds

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
      const latestCall = calls.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
      
      setIncomingCall(latestCall || null);
    });

    return () => {
        unsubscribe();
        clearInterval(intervalId);
    }
  }, [user]);

  // Effect to play/stop ringtone
  useEffect(() => {
    if (incomingCall && ringtoneRef.current) {
        ringtoneRef.current.loop = true;
        ringtoneRef.current.play().catch(e => {
            console.warn("Ringtone autoplay was blocked by the browser.", e);
        });
    } else if (!incomingCall && ringtoneRef.current) {
        ringtoneRef.current.pause();
        ringtoneRef.current.currentTime = 0;
    }
  }, [incomingCall]);

  const handleAccept = async () => {
    if (!incomingCall) return;
    const callId = incomingCall.id;
    setIncomingCall(null);
    await updateCallStatus(callId, 'active');
    router.push(`/call/${callId}`);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    await updateCallStatus(incomingCall.id, 'declined');
    setIncomingCall(null);
  };

  return (
    <>
      <audio ref={ringtoneRef} src="https://cdn.pixabay.com/audio/2022/08/17/audio_313c0b8b89.mp3" preload="auto" />
      <AnimatePresence>
        {incomingCall && (
          <motion.div
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-4 inset-x-4 z-[200] max-w-sm mx-auto"
          >
            <div className="bg-background/80 backdrop-blur-lg rounded-2xl shadow-2xl p-4 border flex items-center gap-4">
                <div className="flex items-center gap-4 flex-1 cursor-pointer" onClick={handleAccept}>
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={incomingCall.callerInfo.photoURL || undefined} />
                        <AvatarFallback>{incomingCall.callerInfo.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <p className="font-bold">{incomingCall.callerInfo.username}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                           {incomingCall.type === 'video' ? <Video className="h-4 w-4"/> : <Phone className="h-4 w-4"/>}
                           {incomingCall.type === 'video' ? 'Görüntülü arama' : 'Sesli arama'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button onClick={(e) => {e.stopPropagation(); handleDecline();}} variant="destructive" size="icon" className="h-10 w-10 rounded-full">
                        <PhoneOff className="h-5 w-5"/>
                    </Button>
                     <Button onClick={(e) => {e.stopPropagation(); handleAccept();}} size="icon" className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600">
                        <Phone className="h-5 w-5"/>
                    </Button>
                </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
