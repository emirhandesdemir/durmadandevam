
"use client";

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room } from '@/components/feed/post-card'; 
import { Loader2, Radio } from 'lucide-react';
import ActiveRoomCard from './ActiveRoomCard';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

// Fisher-Yates shuffle algoritması
const shuffleArray = (array: Room[]) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

/**
 * Ana sayfada aktif odaları yatay bir listede gösteren bölüm.
 */
export default function ActiveRooms() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // En son oluşturulan 20 odayı dinle
        const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const roomsData: Room[] = [];
            querySnapshot.forEach((doc) => {
                roomsData.push({ id: doc.id, ...doc.data() } as Room);
            });
            // Rastgele 4 tanesini seçmek için karıştır ve ilk 4'ü al
            setRooms(shuffleArray(roomsData).slice(0, 4));
            setLoading(false);
        }, (error) => {
            console.error("Oda verisi çekilirken hata:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return (
        <Card className="shadow-md transition-shadow hover:shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                    <Radio className="text-primary" />
                    Aktif Odalar
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex h-24 items-center justify-center">
                        <Loader2 className="animate-spin text-primary" />
                    </div>
                ) : rooms.length > 0 ? (
                    <div className="space-y-3">
                        {rooms.map((room) => (
                            <ActiveRoomCard
                                key={room.id}
                                id={room.id}
                                name={room.name}
                                topic={room.topic}
                                participantCount={Math.floor(Math.random() * 8)} // Temsili veri
                                capacity={8} // Temsili veri
                            />
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-sm text-muted-foreground">
                        Şu anda aktif oda bulunmuyor.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
