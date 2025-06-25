"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn, Users, Check, Loader2, AlertTriangle } from "lucide-react";
import { Timestamp, arrayUnion, doc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";

export interface Room {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
    };
    createdAt: Timestamp;
    participants: { uid: string, username: string }[];
    maxParticipants: number;
}

interface RoomCardProps {
    room: Room;
}

/**
 * Oda listesinde tek bir odayı temsil eden kart.
 */
export default function RoomCard({ room }: RoomCardProps) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);

    const participants = room.participants || [];
    
    const timeAgo = room.createdAt
        ? formatDistanceToNow(room.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    const creatorInitial = room.createdBy.username?.charAt(0).toUpperCase() || '?';
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);

    const handleJoinRoom = async () => {
        if (!currentUser) {
            toast({ title: "Giriş Gerekli", description: "Odaya katılmak için giriş yapmalısınız.", variant: "destructive" });
            return;
        }
        if (isFull || isParticipant) return;

        setIsJoining(true);
        const roomRef = doc(db, "rooms", room.id);
        const messagesRef = collection(db, "rooms", room.id, "messages");

        try {
            const batch = writeBatch(db);

            batch.update(roomRef, {
                participants: arrayUnion({
                    uid: currentUser.uid,
                    username: currentUser.displayName || "Anonim"
                })
            });

            batch.set(doc(messagesRef), {
                type: 'system',
                uid: 'system',
                username: 'System',
                text: `${currentUser.displayName || 'Bir kullanıcı'} odaya katıldı.`,
                createdAt: serverTimestamp(),
            });

            await batch.commit();

            toast({ title: "Başarılı!", description: `"${room.name}" odasına katıldınız.` });
            router.push(`/rooms/${room.id}`);

        } catch (error) {
            console.error("Odaya katılırken hata: ", error);
            toast({ title: "Hata", description: "Odaya katılırken bir sorun oluştu.", variant: "destructive" });
        } finally {
            setIsJoining(false);
        }
    };

    return (
        <Card className="flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-2 rounded-3xl border-0 shadow-lg shadow-black/5">
            <CardHeader className="flex-row items-start gap-4 space-y-0 p-6 pb-2">
                <Avatar className="mt-1 h-12 w-12 border-2 border-white shadow-md">
                     <AvatarImage src={`https://i.pravatar.cc/150?u=${room.createdBy.uid}`} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground">{creatorInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <CardTitle className="text-xl font-bold">{room.name}</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        {room.createdBy.username} tarafından {timeAgo} oluşturuldu
                    </CardDescription>
                </div>
            </CardHeader>
            <CardContent className="p-6 pt-2 flex-1">
              <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/30 p-4 rounded-b-3xl">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">{participants.length} / {room.maxParticipants}</span>
                </div>
                {isParticipant ? (
                    <Button variant="outline" className="rounded-full" onClick={() => router.push(`/rooms/${room.id}`)}>
                        <Check className="mr-2" /> Odaya Gir
                    </Button>
                ) : (
                    <Button onClick={handleJoinRoom} disabled={isJoining || isFull} className="rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105">
                        {isJoining ? <Loader2 className="mr-2 animate-spin" /> : (isFull ? <AlertTriangle className="mr-2" /> : <LogIn className="mr-2" />)}
                        {isFull ? 'Oda Dolu' : 'Odaya Katıl'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
