// src/components/rooms/CreateRoomCard.tsx
"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ChevronRight, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, limit, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';
import type { Room } from '@/lib/types';
import RoomManagementDialog from './RoomManagementDialog';
import { createRoom } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export default function CreateRoomCard() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const { i18n } = useTranslation();
    const [userRoom, setUserRoom] = useState<Room | null | 'loading'>('loading');
    const [isActivating, setIsActivating] = useState(false);
    const [isManagementOpen, setIsManagementOpen] = useState(false);
    const [lastActivation, setLastActivation] = useState<Timestamp | null>(null);

    const username = user?.displayName?.split(' ')[0] || 'Dostum';

    useEffect(() => {
        if (!user) {
            setUserRoom(null);
            return;
        }
        setUserRoom('loading');
        const q = query(collection(db, "rooms"), where("createdBy.uid", "==", user.uid), limit(1));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const roomData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Room;
                setUserRoom(roomData);
                setLastActivation(roomData.lastFreeActivation || null);
            } else {
                setUserRoom(null);
            }
        }, (error) => {
            console.error("Error fetching user room:", error);
            setUserRoom(null);
        });

        return () => unsubscribe();
    }, [user]);

    const handleActivateRoom = async () => {
        if (!user || !userData) return;
        setIsActivating(true);
        try {
            await createRoom(user.uid, {
                name: `${userData.username}'s Room`,
                description: "Sohbet ve eğlence zamanı!",
                language: i18n.language
            }, {
                username: userData.username,
                photoURL: userData.photoURL,
                role: userData.role || 'user',
                selectedAvatarFrame: userData.selectedAvatarFrame || ''
            });
            toast({ description: "Odanız 20 dakika boyunca aktifleştirildi!" });
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setIsActivating(false);
        }
    };
    
    if (userRoom === 'loading') {
        return <Skeleton className="h-40 w-full" />;
    }

    const isRoomActive = userRoom && userRoom.expiresAt && userRoom.expiresAt.toDate() > new Date();

    if (isRoomActive) {
         return (
            <>
                <Card className="bg-muted/50">
                    <CardHeader className="flex-row items-center justify-between p-4">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-bold">Odanı Yönet</CardTitle>
                            <CardDescription>
                                Odan aktif. Ayarları yönet veya hemen sohbete katıl.
                            </CardDescription>
                        </div>
                         <div className="flex items-center gap-2">
                            <Button onClick={() => setIsManagementOpen(true)} size="icon" variant="secondary">
                                <Settings className="h-5 w-5" />
                            </Button>
                            <Button asChild size="icon">
                                <Link href={`/rooms/${userRoom!.id}`}>
                                    <ChevronRight className="h-5 w-5" />
                                </Link>
                            </Button>
                        </div>
                    </CardHeader>
                </Card>
                <RoomManagementDialog 
                    isOpen={isManagementOpen}
                    setIsOpen={setIsManagementOpen}
                    room={userRoom}
                />
            </>
        );
    }
    
    return (
        <Card className="border-dashed border-primary/50 bg-primary/10 hover:border-primary transition-colors">
            <CardHeader className="text-center p-6">
                <CardTitle>Sana Özel Oda</CardTitle>
                <CardDescription>
                    Herkesin bir odası var! Her 24 saatte bir 20 dakika ücretsiz olarak odanı aktifleştirebilirsin.
                </CardDescription>
                <Button onClick={handleActivateRoom} disabled={isActivating} className="mt-2 w-fit mx-auto">
                    {isActivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <PlusCircle className="mr-2 h-4 w-4" />}
                    Odanı Aktifleştir
                </Button>
            </CardHeader>
        </Card>
    );
}
