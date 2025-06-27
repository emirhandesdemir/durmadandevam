// src/components/rooms/RoomCard.tsx
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { LogIn, Check, Loader2, AlertTriangle, Crown, ShieldCheck } from "lucide-react";
import { Timestamp, arrayUnion, doc, writeBatch, collection, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Oda Listeleme Kartı (RoomCard)
 * 
 * Odalar listesinde tek bir odayı temsil eden kart bileşeni.
 * - Oda adı, açıklaması, kurucusu ve katılımcı sayısı gibi bilgileri gösterir.
 * - Katılımcı avatarlarını yığılmış bir şekilde gösterir.
 * - Kullanıcının odaya katılması veya zaten katılmışsa girmesi için butonlar içerir.
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
    participants: { uid: string, username: string, photoURL?: string | null }[];
    maxParticipants: number;
    nextGameTimestamp?: Timestamp;
}

interface RoomCardProps {
    room: Room;
}

const cardBackgrounds = [
    "from-purple-500 via-fuchsia-500 to-pink-500",
    "from-blue-500 via-teal-500 to-green-500",
    "from-red-500 via-orange-500 to-yellow-500",
    "from-indigo-500 via-sky-500 to-cyan-500"
];

export default function RoomCard({ room }: RoomCardProps) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);

    // Güvenlik kontrolü ve katılımcı bilgilerini al
    const participants = room.participants || [];
    const creator = room.createdBy;
    
    // Rastgele bir arkaplan stili seç
    const bgClass = cardBackgrounds[room.id.charCodeAt(0) % cardBackgrounds.length];

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
            batch.update(roomRef, {
                participants: arrayUnion({
                    uid: currentUser.uid,
                    username: currentUser.displayName || "Anonim",
                    photoURL: currentUser.photoURL || null
                })
            });
            batch.set(doc(messagesRef), {
                type: 'system',
                text: `${currentUser.displayName || 'Bir kullanıcı'} odaya katıldı.`,
                createdAt: serverTimestamp(), uid: 'system', username: 'System',
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
    
    const handleEnterRoom = () => {
        router.push(`/rooms/${room.id}`);
    }

    return (
        <Card className="flex flex-col group transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1 rounded-3xl border-0 bg-card shadow-lg shadow-black/5 overflow-hidden">
            {/* Üst Kısım: Renkli Başlık */}
            <div className={cn("p-5 text-white bg-gradient-to-br", bgClass)}>
                 <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/50 shadow-sm">
                        <AvatarImage src={creator.photoURL || undefined} />
                        <AvatarFallback className="bg-black/20 text-white">{creator.username?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div>
                        <div className="flex items-center gap-1.5">
                            <p className="text-base font-bold leading-tight">{creator.username}</p>
                            <Crown className="h-4 w-4" />
                            {creator.role === 'admin' && <ShieldCheck className="h-4 w-4" />}
                        </div>
                        <p className="text-xs text-white/80">Oda Sahibi</p>
                    </div>
                </div>
            </div>
            
            {/* Orta Kısım: Oda Bilgileri */}
            <CardContent className="p-5 flex-1 space-y-2">
              <h3 className="font-bold text-lg text-card-foreground line-clamp-1">{room.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 h-10">{room.description}</p>
            </CardContent>
            
            {/* Alt Kısım: Katılımcılar ve Buton */}
            <div className="flex justify-between items-center bg-muted/30 p-4 mt-auto">
                {/* Yığılmış Avatarlar */}
                <div className="flex items-center gap-2">
                    <div className="flex -space-x-3 overflow-hidden">
                        {participants.slice(0, 3).map(p => (
                            <Avatar key={p.uid} className="h-8 w-8 rounded-full border-2 border-background">
                                <AvatarImage src={p.photoURL || undefined} />
                                <AvatarFallback className="text-xs">{p.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                     {participants.length > 3 && (
                        <div className="text-xs font-semibold text-muted-foreground pl-3">
                            +{participants.length - 3} kişi daha
                        </div>
                    )}
                     {participants.length <= 3 && participants.length > 0 &&(
                         <div className="text-xs font-semibold text-muted-foreground">
                            {participants.map(p => p.username).join(', ')}
                        </div>
                     )}
                </div>

                {isParticipant ? (
                    <Button variant="ghost" size="sm" className="rounded-full" onClick={handleEnterRoom}>
                        <Check className="mr-2 h-4 w-4" /> Gir
                    </Button>
                ) : (
                    <Button 
                      onClick={handleJoinRoom} 
                      disabled={isJoining || isFull}
                      size="sm"
                      className={cn(
                          "rounded-full shadow-lg transition-transform hover:scale-105",
                          isFull 
                            ? "bg-destructive text-destructive-foreground cursor-not-allowed" 
                            : "bg-primary text-primary-foreground"
                      )}
                    >
                        {isJoining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isFull ? <AlertTriangle className="mr-2 h-4 w-4" /> : <LogIn className="mr-2 h-4 w-4" />)}
                        {isJoining ? 'Katılıyor...' : (isFull ? 'Dolu' : 'Katıl')}
                    </Button>
                )}
            </div>
        </Card>
    );
}
