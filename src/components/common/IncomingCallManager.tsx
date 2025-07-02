// src/components/common/IncomingCallManager.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Call } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Phone, PhoneOff } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { updateCallStatus } from '@/lib/actions/callActions';

export default function IncomingCallManager() {
  const { user } = useAuth();
  const router = useRouter();
  const [incomingCall, setIncomingCall] = useState<Call | null>(null);

  useEffect(() => {
    if (!user) return;
    
    // Check for calls that have been ringing for more than 30 seconds and mark them as missed
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
                await updateCallStatus(doc.id, 'missed');
            });
        });
    };

    const intervalId = setInterval(checkMissedCalls, 15000); // Check every 15 seconds

    const q = query(
      collection(db, 'calls'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'ringing')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const calls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Call));
      const latestCall = calls.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis())[0];
      
      if (latestCall) {
          const isExpired = (latestCall.createdAt.toMillis() + 30000) < Date.now();
          if(!isExpired) {
            setIncomingCall(latestCall);
          } else {
            updateCallStatus(latestCall.id, 'missed');
            setIncomingCall(null);
          }
      } else {
        setIncomingCall(null);
      }
    });

    return () => {
        unsubscribe();
        clearInterval(intervalId);
    }
  }, [user]);

  const handleAccept = () => {
    if (!incomingCall) return;
    router.push(`/call/${incomingCall.id}`);
    setIncomingCall(null);
  };

  const handleDecline = async () => {
    if (!incomingCall) return;
    await updateCallStatus(incomingCall.id, 'declined');
    setIncomingCall(null);
  };

  return (
    <AnimatePresence>
      {incomingCall && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center"
        >
          <div className="flex flex-col items-center justify-center gap-4 text-white">
            <Avatar className="h-32 w-32 border-4">
              <AvatarImage src={incomingCall.callerInfo.photoURL || undefined} />
              <AvatarFallback className="text-5xl">{incomingCall.callerInfo.username.charAt(0)}</AvatarFallback>
            </Avatar>
            <h2 className="text-4xl font-bold">{incomingCall.callerInfo.username}</h2>
            <p className="text-xl">Gelen arama...</p>
          </div>

          <div className="absolute bottom-20 flex w-full justify-around">
             <div className="flex flex-col items-center gap-2">
                <Button onClick={handleDecline} variant="destructive" size="icon" className="h-16 w-16 rounded-full">
                    <PhoneOff className="h-8 w-8"/>
                </Button>
                <span className="text-white">Reddet</span>
             </div>
             <div className="flex flex-col items-center gap-2">
                <Button onClick={handleAccept} variant="default" size="icon" className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600">
                    <Phone className="h-8 w-8"/>
                </Button>
                <span className="text-white">Cevapla</span>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
