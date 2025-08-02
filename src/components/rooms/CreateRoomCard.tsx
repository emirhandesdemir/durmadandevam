// src/components/rooms/CreateRoomCard.tsx
"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ChevronRight, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';
import type { Room } from '@/lib/types';
import RoomManagementDialog from './RoomManagementDialog';
import { deleteRoomAsOwner } from '@/lib/actions/roomActions';

export default function CreateRoomCard() {
    const { user } = useAuth();
    const [userRoom, setUserRoom] = useState<Room | null | 'loading'>('loading');
    const [isManagementOpen, setIsManagementOpen] = useState(false);

    useEffect(() => {
        if (!user) {
            setUserRoom(null);
            return;
        }
        setUserRoom('loading');
        const q = query(collection(db, "rooms"), where("createdBy.uid", "==", user.uid), limit(1));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            if (!snapshot.empty) {
                const roomDoc = snapshot.docs[0];
                const roomData = { id: roomDoc.id, ...doc.data() } as Room;
                
                const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
                
                if (isExpired && roomData.type !== 'event') {
                    // This logic can be moved to a backend function for better reliability
                    // await deleteRoomAsOwner(roomData.id, user.uid);
                    setUserRoom(null);
                } else {
                    setUserRoom(roomData);
                }
            } else {
                setUserRoom(null);
            }
        }, (error) => {
            console.error("Error fetching user room:", error);
            setUserRoom(null);
        });

        return () => unsubscribe();
    }, [user]);

    // If there is no user room, don't render this card.
    if (userRoom === 'loading' || !userRoom) {
        return null;
    }

    return (
        <>
            <Card className="bg-muted/50">
                <CardHeader className="flex-row items-center justify-between p-4">
                    <div className="space-y-1">
                        <CardTitle className="text-lg font-bold">Odanı Yönet</CardTitle>
                        <CardDescription>
                            Odan açık. Ayarları yönet veya hemen sohbete katıl.
                        </CardDescription>
                    </div>
                     <div className="flex items-center gap-2">
                        <Button onClick={() => setIsManagementOpen(true)} size="icon" variant="secondary">
                            <Settings className="h-5 w-5" />
                        </Button>
                        <Button asChild size="icon">
                            <Link href={`/rooms/${userRoom.id}`}>
                                <ChevronRight className="h-5 w-5" />
                            </Link>
                        </Button>
                    </div>
                </CardHeader>
            </Card>
            <RoomManagementDialog 
                isOpen={isManagementOpen}
                setIsOpen={setIsManagementOpen}
                room={userRoom !== 'loading' ? userRoom : null}
            />
        </>
    );
}
