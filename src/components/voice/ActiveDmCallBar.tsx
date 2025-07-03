// src/components/voice/ActiveDmCallBar.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import type { Call } from '@/lib/types';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, ChevronRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function ActiveDmCallBar() {
    const { user } = useAuth();
    const [activeCall, setActiveCall] = useState<Call | null>(null);
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'calls'),
            where('status', '==', 'active'),
            where('participantUids', 'array-contains', user.uid),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const callDoc = snapshot.docs[0];
                setActiveCall({ id: callDoc.id, ...callDoc.data() } as Call);
            } else {
                setActiveCall(null);
            }
        });

        return () => unsubscribe();
    }, [user]);

    const isVisible = activeCall && !pathname.startsWith(`/call/${activeCall.id}`);

    if (!isVisible || !activeCall) {
        return null;
    }
    
    const partner = activeCall.callerId === user?.uid ? activeCall.receiverInfo : activeCall.callerInfo;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                exit={{ y: -100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="fixed top-2 left-0 right-0 z-[101] p-2 pointer-events-none"
                onClick={() => router.push(`/call/${activeCall.id}`)}
            >
                <div className="flex items-center justify-between gap-2 bg-green-500 text-white p-2 rounded-xl shadow-lg w-full max-w-sm mx-auto cursor-pointer pointer-events-auto">
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        <Avatar className="h-8 w-8 border-2 border-white">
                            <AvatarImage src={partner.photoURL || undefined} />
                            <AvatarFallback>{partner.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                            <p className="font-bold truncate text-sm">{partner.username} ile görüşmedesiniz</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4 animate-pulse"/>
                        <ChevronRight className="h-4 w-4"/>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
