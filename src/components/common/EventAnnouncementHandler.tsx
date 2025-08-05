// src/components/common/EventAnnouncementHandler.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Announcement } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Gift, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { joinRoom } from '@/lib/actions/roomActions';
import { useAuth } from '@/contexts/AuthContext';

export default function EventAnnouncementHandler() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useAuth();
    
    useEffect(() => {
        const now = Timestamp.now();
        const q = query(
            collection(db, 'announcements'), 
            where('expiresAt', '>', now)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0]; // Show only one at a time
                setAnnouncement({ id: doc.id, ...doc.data() } as Announcement);
            } else {
                setAnnouncement(null);
            }
        });

        return () => unsubscribe();
    }, []);

    const handleJoin = async () => {
        if (!user || !announcement) return;
        
        try {
            await joinRoom(announcement.roomId, {
                uid: user.uid,
                username: user.displayName,
                photoURL: user.photoURL,
            });
            router.push(`/rooms/${announcement.roomId}`);
            setAnnouncement(null); // Hide after clicking
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        }
    };

    return (
        <AnimatePresence>
            {announcement && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-lg"
                >
                    <div className="flex items-center gap-4 rounded-2xl border border-yellow-500/30 bg-background/80 p-4 shadow-2xl backdrop-blur-lg">
                        <div className="p-3 rounded-full bg-yellow-500/20">
                            <Gift className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-yellow-500">Etkinlik Daveti!</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                                {announcement.hostUsername} sizi <strong className="text-foreground">"{announcement.roomName}"</strong> odasına davet ediyor. Katıl ve ödülleri kap!
                            </p>
                        </div>
                        <Button onClick={handleJoin} className="bg-yellow-500 hover:bg-yellow-600">
                             <Zap className="mr-2 h-4 w-4" />
                            Katıl ve {announcement.rewardAmount} Elmas Kazan
                        </Button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
