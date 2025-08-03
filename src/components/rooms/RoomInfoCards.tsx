// src/components/rooms/RoomInfoCards.tsx
'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit2, Pin, X, Loader2 } from 'lucide-react';
import type { Room, Message } from '@/lib/types';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { unpinMessage } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';

interface RoomInfoCardsProps {
  room: Room;
  isOwner: boolean;
}

export default function RoomInfoCards({ room, isOwner }: RoomInfoCardsProps) {
    const { toast } = useToast();
    const [pinnedMessage, setPinnedMessage] = useState<Message | null>(null);
    const [loading, setLoading] = useState(true);
    const [isUnpinning, setIsUnpinning] = useState(false);

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

    const handleUnpin = async () => {
        if (!isOwner || !room.id) return;
        setIsUnpinning(true);
        try {
            await unpinMessage(room.id, room.createdBy.uid);
            toast({ description: "Sabitlenmiş mesaj kaldırıldı." });
        } catch (e: any) {
            toast({ variant: 'destructive', description: e.message });
        } finally {
            setIsUnpinning(false);
        }
    }


    if (!room.rules && !room.welcomeMessage && !pinnedMessage && !loading) {
        return null;
    }

    return (
        <div className="px-4 space-y-3">
            {!loading && pinnedMessage && (
                 <Card className="bg-primary/10 border-primary/30 shadow-md max-w-md mr-auto">
                    <CardHeader className="p-3 flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-sm text-primary font-bold">
                            <Pin className="h-4 w-4" />
                            Sabitlenmiş Mesaj
                        </CardTitle>
                        {isOwner && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleUnpin} disabled={isUnpinning}>
                                {isUnpinning ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4" />}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-3 pt-0 text-sm">
                        <strong className="text-muted-foreground">{pinnedMessage.username}:</strong> {pinnedMessage.text}
                    </CardContent>
                </Card>
            )}
            {room.rules && (
                <Card className="bg-card">
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
                 <Card className="bg-card">
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
