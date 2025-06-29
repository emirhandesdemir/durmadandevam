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
    const username = user?.displayName?.split(' ')[0] || 'Dostum';

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
                
                // Oda sahibi bu kartı gördüğünde, odası süresi dolmuşsa otomatik olarak sil.
                const isExpired = roomData.expiresAt && (roomData.expiresAt as Timestamp).toDate() < new Date();
                
                if (isExpired) {
                    // Bu işlem, onSnapshot'ın tekrar tetiklenmesini sağlayacak ve userRoom'u null yapacaktır.
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

    const renderButton = () => {
        if (userRoom === 'loading') {
            return <Skeleton className="h-16 w-full md:w-52 rounded-full" />;
        }
        if (userRoom) {
            return (
                <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                    <Button
                        asChild
                        size="lg"
                        className="w-full shrink-0 rounded-full bg-white/20 text-white backdrop-blur-sm border border-white/30 shadow-lg transition-transform hover:scale-105 active:scale-95 px-8 py-6 text-base font-semibold"
                    >
                        <Link href={`/rooms/${userRoom.id}`}>
                            Odaya Gir
                            <ChevronRight className="mr-2" />
                        </Link>
                    </Button>
                     <Button
                        onClick={() => setIsManagementOpen(true)}
                        size="lg"
                        variant="secondary"
                        className="w-full shrink-0 rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95 px-8 py-6 text-base font-semibold"
                    >
                        <Settings className="mr-2" />
                        Odanı Yönet
                    </Button>
                </div>
            );
        }
        return (
            <Button
                asChild
                size="lg"
                className="w-full shrink-0 md:w-auto rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95 px-8 py-6 text-lg font-semibold"
            >
                <Link href="/create-room">
                    <PlusCircle className="mr-2" />
                    Oda Oluştur
                </Link>
            </Button>
        );
    }


    return (
        <>
            <Card className="bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-primary-foreground shadow-2xl shadow-primary/20 rounded-3xl">
                <CardHeader className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left p-8">
                    <div className="space-y-2">
                        <CardTitle className="text-3xl font-bold">Hoş geldin, {username}!</CardTitle>
                        <CardDescription className="text-primary-foreground/90 text-base">
                            {userRoom && userRoom !== 'loading' ? "Mevcut odanı yönetebilir veya diğer odalara katılabilirsin." : "Kendi sohbet odanı oluştur veya mevcut odalara katıl."}
                        </CardDescription>
                    </div>
                    {renderButton()}
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
