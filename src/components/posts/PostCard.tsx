// src/components/posts/PostCard.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "./PostsFeed";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { doc, writeBatch, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface PostCardProps {
    post: Post;
}

/**
 * PostCard Bileşeni
 * 
 * Tek bir gönderiyi görüntüleyen karttır.
 * - Kullanıcı bilgilerini (avatar, isim), gönderi metnini ve resmini gösterir.
 * - Gönderinin ne kadar zaman önce paylaşıldığını formatlar.
 * - Beğenme (like) işlevselliğini yönetir.
 */
export default function PostCard({ post }: PostCardProps) {
    const { user: currentUser } = useAuth(); // Mevcut kullanıcıyı al
    
    // Geçerli kullanıcının bu gönderiyi beğenip beğenmediğini kontrol et (post.likes tanımsız olabilir)
    const isLiked = currentUser ? (post.likes || []).includes(currentUser.uid) : false;
    
    const [isLiking, setIsLiking] = useState(false); // Beğenme işlemi sırasında yükleme durumunu yönet

    // Gönderinin ne kadar süre önce paylaşıldığını hesapla (örn: "2 saat önce")
    const timeAgo = post.createdAt
        ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    // Beğenme butonuna tıklandığında çalışacak fonksiyon
    const handleLike = async () => {
        if (!currentUser || isLiking) return; // Kullanıcı giriş yapmamışsa veya zaten bir işlem varsa işlemi durdur
        
        setIsLiking(true);
        const postRef = doc(db, "posts", post.id);

        try {
            const batch = writeBatch(db); // Atomik işlemler için bir batch oluştur
            const currentLikeCount = post.likeCount || 0;

            if (isLiked) {
                // Eğer zaten beğenilmişse, beğeniyi geri al (UID'yi diziden çıkar)
                 batch.update(postRef, {
                    likes: arrayRemove(currentUser.uid),
                    likeCount: currentLikeCount - 1
                });
            } else {
                // Eğer beğenilmemişse, beğen (UID'yi diziye ekle)
                 batch.update(postRef, {
                    likes: arrayUnion(currentUser.uid),
                    likeCount: currentLikeCount + 1
                });
            }
            await batch.commit(); // Değişiklikleri veritabanına işle
        } catch (error) {
            console.error("Error liking post:", error);
        } finally {
            setIsLiking(false);
        }
    };

    return (
        <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
            {/* Kart Başlığı: Kullanıcı bilgileri ve seçenekler butonu */}
            <CardHeader className="flex flex-row items-center justify-between p-6">
                <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-white">
                        <AvatarImage src={post.userAvatar} />
                        <AvatarFallback>{post.username?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold">{post.username}</p>
                        <p className="text-sm text-muted-foreground">{timeAgo}</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal />
                </Button>
            </CardHeader>

            {/* Kart İçeriği: Gönderi metni ve resmi */}
            <CardContent className="space-y-4 px-6 pb-2 pt-0">
                <p className="text-base leading-relaxed whitespace-pre-wrap">{post.text}</p>
                {post.imageUrl && (
                    <div className="overflow-hidden rounded-2xl border">
                        <Image
                            src={post.imageUrl}
                            alt="Gönderi resmi"
                            width={600}
                            height={400}
                            className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105"
                        />
                    </div>
                )}
            </CardContent>

            {/* Kart Alt Bilgisi: Beğeni ve yorum butonları */}
            <CardFooter className="flex items-center justify-start gap-4 p-6 pt-4">
                <Button 
                    variant="ghost" 
                    className={cn(
                        "group rounded-full px-4 text-muted-foreground hover:bg-red-500/10 hover:text-red-500",
                        isLiked && "text-red-500"
                    )}
                    onClick={handleLike}
                    disabled={isLiking || !currentUser}
                >
                    <Heart className={cn(
                        "mr-2 transition-colors", 
                        isLiked && "fill-current"
                    )} />
                    {post.likeCount || 0}
                </Button>
                <Button variant="ghost" className="group rounded-full px-4 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500">
                    <MessageCircle className="mr-2" />
                    {post.commentCount || 0}
                </Button>
            </CardFooter>
        </Card>
    );
}
