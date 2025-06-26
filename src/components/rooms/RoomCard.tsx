// src/components/rooms/RoomCard.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn, Users, Check, Loader2, AlertTriangle, Crown, ShieldCheck } from "lucide-react";
import { Timestamp, arrayUnion, doc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";


/**
 * Oda Listeleme Kartı (RoomCard)
 * 
 * Odalar listesinde tek bir odayı temsil eden kart bileşenidir.
 * - Oda adı, açıklaması, kurucusu ve katılımcı sayısı gibi bilgileri gösterir.
 * - Kullanıcının odaya katılması veya zaten katılmışsa girmesi için butonlar içerir.
 * - Oda doluysa "Katıl" butonu devre dışı bırakılır.
 * - Modern, renkli ve "havada süzülen" bir tasarıma sahiptir.
 */

// Oda verisinin arayüzü
export interface Room {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
        photoURL?: string | null;
        role?: 'admin' | 'user';
    };
    createdAt: Timestamp;
    participants: { uid: string, username: string }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
}

interface RoomCardProps {
    room: Room;
}

export default function RoomCard({ room }: RoomCardProps) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);

    // Güvenlik kontrolü: participants tanımsızsa boş dizi ata
    const participants = room.participants || [];
    
    const timeAgo = room.createdAt
        ? formatDistanceToNow(room.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    const creatorInitial = room.createdBy.username?.charAt(0).toUpperCase() || '?';
    const isFull = participants.length >= room.maxParticipants;
    const isParticipant = participants.some(p => p.uid === currentUser?.uid);

    // Odaya katılma fonksiyonu
    const handleJoinRoom = async () => {
        if (!currentUser) {
            toast({ title: "Giriş Gerekli", description: "Odaya katılmak için giriş yapmalısınız.", variant: "destructive" });
            router.push('/login');
            return;
        }
        if (isFull || isParticipant || isJoining) return;

        setIsJoining(true);
        const roomRef = doc(db, "rooms", room.id);
        const messagesRef = collection(db, "rooms", room.id, "messages");

        try {
            const batch = writeBatch(db);

            // 1. Kullanıcıyı `participants` dizisine ekle
            batch.update(roomRef, {
                participants: arrayUnion({
                    uid: currentUser.uid,
                    username: currentUser.displayName || "Anonim"
                })
            });

            // 2. Odaya katıldığına dair bir sistem mesajı oluştur
            batch.set(doc(messagesRef), {
                type: 'system',
                uid: 'system',
                username: 'System',
                text: `${currentUser.displayName || 'Bir kullanıcı'} odaya katıldı.`,
                createdAt: serverTimestamp(),
            });

            // Batch işlemini gerçekleştir
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
    
    // Odaya girme fonksiyonu (zaten katılımcıysa)
    const handleEnterRoom = () => {
        router.push(`/rooms/${room.id}`);
    }

    return (
        <Card className="flex flex-col transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 rounded-3xl border-0 bg-card/80 backdrop-blur-sm shadow-lg shadow-black/5 overflow-hidden">
            <CardHeader className="p-5">
                <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                            <AvatarImage src={room.createdBy.photoURL || undefined} />
                            <AvatarFallback className="bg-secondary text-secondary-foreground">{creatorInitial}</AvatarFallback>
                        </Avatar>
                        <div>
                             <div className="flex items-center gap-1.5">
                                <p className="text-base font-bold leading-tight text-card-foreground">{room.createdBy.username}</p>
                                <TooltipProvider>
                                    <Tooltip>
                                        <TooltipTrigger>
                                            <Crown className="h-4 w-4 text-amber-500" />
                                        </TooltipTrigger>
                                        <TooltipContent><p>Oda Kurucusu</p></TooltipContent>
                                    </Tooltip>
                                </TooltipProvider>
                                {room.createdBy.role === 'admin' && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <ShieldCheck className="h-4 w-4 text-primary" />
                                            </TooltipTrigger>
                                            <TooltipContent><p>Yönetici</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground">
                                {timeAgo} oluşturdu
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-5 pt-0 flex-1">
              <h3 className="font-bold text-lg mb-1">{room.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">{room.description}</p>
            </CardContent>
            <CardFooter className="flex justify-between items-center bg-muted/30 p-4 mt-auto">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-semibold text-foreground">{participants.length} / {room.maxParticipants}</span>
                </div>
                {isParticipant ? (
                    <Button variant="outline" className="rounded-full" onClick={handleEnterRoom}>
                        <Check className="mr-2 h-4 w-4" /> Odaya Gir
                    </Button>
                ) : (
                    <Button 
                      onClick={handleJoinRoom} 
                      disabled={isJoining || isFull} 
                      className={cn(
                          "rounded-full shadow-lg transition-transform hover:scale-105 text-white",
                          isFull 
                            ? "bg-destructive" 
                            : "bg-gradient-to-r from-purple-500 to-pink-500 shadow-primary/30"
                      )}
                    >
                        {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isFull ? <AlertTriangle className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />)}
                        {isJoining ? 'Katılıyor...' : (isFull ? 'Oda Dolu' : 'Odaya Katıl')}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}
