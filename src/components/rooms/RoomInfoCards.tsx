// src/components/rooms/RoomInfoCards.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Pin } from 'lucide-react';
import type { Room, Message } from '@/lib/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';

interface RoomInfoCardsProps {
  room: Room;
  isOwner: boolean;
}

export default function RoomInfoCards({ room, isOwner }: RoomInfoCardsProps) {
    const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!room.pinnedMessageId) {
            setPinnedMessage(null);
            setLoading(false);
            return;
        }
        setLoading(true);
        const unsub = onSnapshot(doc(db, `rooms/${room.id}/messages/${room.pinnedMessageId}`), (doc) => {
            if (doc.exists()) {
                setPinnedMessage({ id: doc.id, ...doc.data() } as Message);
            } else {
                setPinnedMessage(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [room.pinnedMessageId, room.id]);


    // TODO: Add edit dialogs for rules and welcome message
    const handleEditRules = () => {};
    const handleEditWelcome = () => {};

    if (!room.rules && !room.welcomeMessage && !pinnedMessage && !loading) {
        return null;
    }

    return (
        <div className="px-4 space-y-3 my-4">
            {!loading && pinnedMessage && (
                 <Card className="bg-card/30 border-primary/20">
                    <CardHeader className="p-3">
                        <CardTitle className="flex items-center gap-2 text-sm text-primary">
                            <Pin className="h-4 w-4" />
                            Sabitlenmiş Mesaj
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm">
                        <strong className="text-muted-foreground">{pinnedMessage.username}:</strong> {pinnedMessage.text}
                    </CardContent>
                </Card>
            )}
            {room.rules && (
                <Card className="bg-card/30">
                    <CardHeader className="flex-row items-center justify-between p-3">
                        <CardTitle className="text-sm">Parti Kuralları</CardTitle>
                        {isOwner && <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-4 w-4" /></Button>}
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                        {room.rules}
                    </CardContent>
                </Card>
            )}
            {room.welcomeMessage && (
                 <Card className="bg-card/30">
                    <CardHeader className="flex-row items-center justify-between p-3">
                        <CardTitle className="text-sm">Otomatik Hoşgeldin Mesajı</CardTitle>
                        {isOwner && <Button variant="ghost" size="icon" className="h-7 w-7"><Edit2 className="h-4 w-4" /></Button>}
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm text-muted-foreground">
                        {room.welcomeMessage}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
