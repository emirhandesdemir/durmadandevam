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
                const roomData = { id: roomDoc.id, ...roomDoc.data() } as Room;
                
                const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
                
                if (isExpired && roomData.type !== 'event') {
                    await deleteRoomAsOwner(roomData.id, user.uid);
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

    const renderContent = () => {
        if (userRoom === 'loading') {
            return <Skeleton className="h-24 w-full" />;
        }
        if (userRoom) {
            return (
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                    <Button asChild size="lg" className="w-full shrink-0 rounded-full text-base font-semibold">
                        <Link href={`/rooms/${userRoom.id}`}>
                            Odaya Gir <ChevronRight className="ml-2 h-5 w-5" />
                        </Link>
                    </Button>
                     <Button onClick={() => setIsManagementOpen(true)} size="lg" variant="secondary" className="w-full shrink-0 rounded-full text-base font-semibold">
                        <Settings className="mr-2 h-5 w-5" /> Yönet
                    </Button>
                </div>
            );
        }
        return (
            <Button asChild size="lg" className="w-full rounded-full text-lg font-semibold">
                <Link href="/create-room">
                    <PlusCircle className="mr-2 h-6 w-6" /> Oda Oluştur
                </Link>
            </Button>
        );
    }


    return (
        <>
            <Card className="bg-muted/50 border-dashed border-2">
                <CardHeader className="p-4">
                    <div className="space-y-2">
                        <CardTitle className="text-xl font-bold">Yeni Bir Maceraya Atıl</CardTitle>
                        <CardDescription className="text-base">
                            {userRoom && userRoom !== 'loading' ? "Mevcut odanı yönet veya yeni odalara göz at." : "Kendi sohbet odanı oluştur veya diğer odalara katıl."}
                        </CardDescription>
                    </div>
                     <div className="pt-4">
                        {renderContent()}
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
