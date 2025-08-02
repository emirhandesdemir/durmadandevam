// src/components/rooms/LeadershipBoard.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Users, Crown, Gift, Trophy } from 'lucide-react';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Button } from '../ui/button';

const medalColors = [
    'border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20', // Gold
    'border-slate-400 bg-slate-400/10 hover:bg-slate-400/20',   // Silver
    'border-orange-600 bg-orange-600/10 hover:bg-orange-600/20' // Bronze
];

type Category = 'popular' | 'generous' | 'premium';

export default function LeadershipBoard() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [category, setCategory] = useState<Category>('popular');

    useEffect(() => {
        setLoading(true);
        let q;
        switch (category) {
            case 'generous':
                q = query(collection(db, 'rooms'), orderBy('totalGiftValue', 'desc'), limit(10));
                break;
            case 'premium':
                q = query(collection(db, 'rooms'), where('createdBy.isPremium', '==', true), orderBy('voiceParticipantsCount', 'desc'), limit(10));
                 // Note: This query requires a composite index on `createdBy.isPremium` and `voiceParticipantsCount`.
                break;
            case 'popular':
            default:
                 q = query(collection(db, 'rooms'), orderBy('voiceParticipantsCount', 'desc'), orderBy('createdAt', 'desc'), limit(10));
                break;
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Room))
                .filter(room => room.type !== 'event' && (!room.expiresAt || (room.expiresAt as Timestamp).toMillis() > new Date()));
            
            setRooms(roomsData.slice(0, 3)); // Only take top 3 for display
            setLoading(false);
        }, (error) => {
            console.error("Error fetching leadership board:", error);
            if (error.code === 'failed-precondition') {
                 console.warn("Firestore index missing for this query. Please create the required composite index in your Firebase console.");
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [category]);
    
    const categoryLabels = {
        popular: 'En Popüler Odalar',
        generous: 'En Cömert Odalar',
        premium: 'Premium Odalar'
    };

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold tracking-tight">Liderlik Tablosu</h2>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                            <Trophy className="mr-2 h-4 w-4"/> {categoryLabels[category]}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuLabel>Kategori</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => setCategory('popular')}>En Popüler</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCategory('generous')}>En Cömert</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => setCategory('premium')}>Premium</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {rooms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {rooms.map((room, index) => (
                        <Link href={`/rooms/${room.id}`} key={room.id}>
                            <Card className={`relative p-4 border-2 transition-all ${medalColors[index]}`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-bold truncate">{room.name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                             <div className={cn("avatar-frame-wrapper", room.createdBy.selectedAvatarFrame)}>
                                                <Avatar className="relative z-[1] h-4 w-4">
                                                    <AvatarImage src={room.createdBy.photoURL || undefined} />
                                                    <AvatarFallback>{room.createdBy.username?.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                            </div>
                                            <span className="truncate">{room.createdBy.username}</span>
                                        </div>
                                    </div>
                                    <Award className={`h-8 w-8 ${medalColors[index].split(' ')[0].replace('border-','text-')}`} />
                                </div>
                                <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t">
                                     {category === 'generous' ? (
                                        <>
                                            <Gift className="h-4 w-4 text-primary" />
                                            <span>{room.totalGiftValue || 0} Değer</span>
                                        </>
                                     ) : (
                                        <>
                                            <Users className="h-4 w-4" />
                                            <span>{room.participants.length} Katılımcı</span>
                                            <span className="text-muted-foreground mx-1">·</span>
                                            <span className="text-primary font-semibold">{room.voiceParticipantsCount || 0} Sesli</span>
                                        </>
                                     )}
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                 <p className="text-center text-muted-foreground py-8">Bu kategoride gösterilecek oda yok.</p>
            )}
        </div>
    )
}
