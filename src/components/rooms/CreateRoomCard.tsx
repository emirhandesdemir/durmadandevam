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
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const roomDoc = snapshot.docs[0];
                const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
                
                const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
                
                if (isExpired && roomData.type !== 'event') {
                    // This check is now less critical as expired rooms are filtered in the main list.
                    // This prevents an unnecessary delete call from the client if the room is expired.
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

    if (userRoom === 'loading') {
        return <Skeleton className="h-24 w-full" />;
    }

    if (!userRoom) {
         return (
            <Card className="border-dashed border-primary/50 bg-primary/10 hover:border-primary transition-colors">
                <CardHeader className="text-center">
                    <CardTitle>Kendi Odanı Oluştur</CardTitle>
                    <CardDescription>
                        Yeni bir sohbet başlat ve arkadaşlarını davet et.
                    </CardDescription>
                    <Button asChild className="mt-2 w-fit mx-auto">
                        <Link href="/create-room">
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Oda Oluştur
                        </Link>
                    </Button>
                </CardHeader>
            </Card>
        );
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