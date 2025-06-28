// src/components/rooms/LeadershipBoard.tsx
'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room } from '@/lib/types';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Users, Crown } from 'lucide-react';
import Link from 'next/link';

const medalColors = [
    'border-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20', // Gold
    'border-slate-400 bg-slate-400/10 hover:bg-slate-400/20',   // Silver
    'border-orange-600 bg-orange-600/10 hover:bg-orange-600/20' // Bronze
];

export default function LeadershipBoard() {
    const [topRooms, setTopRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, 'rooms'),
            orderBy('voiceParticipantsCount', 'desc'),
            orderBy('createdAt', 'asc'),
            limit(3)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const roomsData = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() } as Room))
                .filter(room => !room.expiresAt || (room.expiresAt as Timestamp).toDate() > new Date());
            
            setTopRooms(roomsData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }

    if (topRooms.length === 0) {
        return null; // Don't show the board if no active rooms
    }

    return (
        <div>
            <h2 className="text-2xl font-bold tracking-tight mb-4">Liderlik Tablosu</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topRooms.map((room, index) => (
                    <Link href={`/rooms/${room.id}`} key={room.id}>
                        <Card className={`p-4 border-2 transition-all ${medalColors[index]}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex-1 overflow-hidden">
                                    <p className="font-bold truncate">{room.name}</p>
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Crown className="h-3 w-3" />
                                        <span className="truncate">{room.createdBy.username}</span>
                                    </div>
                                </div>
                                <Award className={`h-8 w-8 ${medalColors[index].split(' ')[0].replace('border-','text-')}`} />
                            </div>
                            <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t">
                                <Users className="h-4 w-4" />
                                <span>{room.participants.length} Katılımcı</span>
                                <span className="text-muted-foreground mx-1">·</span>
                                <span className="text-primary font-semibold">{room.voiceParticipantsCount || 0} Sesli</span>
                            </div>
                        </Card>
                    </Link>
                ))}
            </div>
        </div>
    )
}
