'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, Timestamp, orderBy, limit } from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { DoorOpen, Zap } from 'lucide-react';
import { joinRoom } from '@/lib/actions/roomActions';

interface PortalData {
    id: string;
    roomId: string;
    roomName: string;
    hostUid: string;
    hostUsername: string;
    expiresAt: Timestamp;
}

export default function InAppNotificationHandler() {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [processedIds, setProcessedIds] = useState(new Set<string>());

    const handleJoinFromToast = async (roomId: string) => {
        if (!user) return;
        try {
            await joinRoom(roomId, { uid: user.uid, username: user.displayName, photoURL: user.photoURL });
            router.push(`/rooms/${roomId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        }
    };

    // Listener for room invites
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, `users/${user.uid}/notifications`),
            where('type', '==', 'room_invite'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added' && !processedIds.has(change.doc.id)) {
                    const notification = change.doc.data() as Notification;
                    if (notification.roomId) {
                        toast({
                            duration: 5000,
                            description: (
                                <div className="flex items-center gap-3">
                                    <DoorOpen className="h-5 w-5 text-primary"/>
                                    <p><strong className="font-semibold">{notification.senderUsername}</strong> sizi <strong>"{notification.roomName}"</strong> odasına davet etti.</p>
                                </div>
                            ),
                            action: (
                                <Button onClick={() => handleJoinFromToast(notification.roomId!)}>
                                    Katıl
                                </Button>
                            ),
                        });
                    }
                    setProcessedIds(prev => new Set(prev).add(change.doc.id));
                }
            });
        });

        return () => unsubscribe();
    }, [user, processedIds, toast, router]);

    // Listener for open portals
    useEffect(() => {
        if (!user) return;
        
        const now = Timestamp.now();
        const q = query(
            collection(db, 'portals'),
            where('expiresAt', '>', now),
            orderBy('expiresAt', 'desc'),
            limit(1)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                 if (change.type === 'added' && !processedIds.has(change.doc.id)) {
                    const portal = { id: change.doc.id, ...change.doc.data() } as PortalData;
                     if (portal.hostUid !== user.uid) {
                        toast({
                            duration: 5000,
                            description: (
                                <div className="flex items-center gap-3">
                                    <Zap className="h-5 w-5 text-yellow-400"/>
                                    <p><strong className="font-semibold">{portal.hostUsername}</strong>, <strong>"{portal.roomName}"</strong> odasına bir portal açtı!</p>
                                </div>
                            ),
                             action: (
                                <Button onClick={() => handleJoinFromToast(portal.roomId)}>
                                    Hemen Katıl
                                </Button>
                            ),
                        });
                    }
                    setProcessedIds(prev => new Set(prev).add(change.doc.id));
                 }
            });
        });
        
        return () => unsubscribe();
    }, [user, processedIds, toast, router]);


    return null; // This component doesn't render anything
}
