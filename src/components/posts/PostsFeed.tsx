// src/components/posts/PostsFeed.tsx
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Heart, MessageCircle, MoreHorizontal } from "lucide-react";
import Image from "next/image";

// Gerçek bir uygulamada bu veriler API'den veya Firestore'dan gelecektir.
// Bu kısım şimdilik temsili (dummy) verilerle doldurulmuştur.
const posts = [
  {
    id: 1,
    user: {
      name: "Elara",
      avatar: "https://i.pravatar.cc/150?u=elara",
    },
    timestamp: "2 saat önce",
    text: "Mükemmel bir gün batımı! 🌅 #doğa #huzur",
    image: "https://placehold.co/600x400.png",
    likes: 125,
    comments: 12,
  },
  {
    id: 2,
    user: {
      name: "Bora",
      avatar: "https://i.pravatar.cc/150?u=bora",
    },
    timestamp: "5 saat önce",
    text: "Yeni projem için kod yazmaya devam ediyorum. Yakında harika bir şey geliyor! 💻🚀",
    image: null,
    likes: 78,
    comments: 23,
  },
];

/**
 * PostsFeed Bileşeni
 * 
 * Ana sayfada kullanıcıların gönderilerini listeleyen akış alanıdır.
 * - Her gönderi ayrı bir kart içinde gösterilir.
 * - Gönderiler kullanıcı avatarı, adı, zaman damgası, metin ve (varsa) resim içerir.
 * - Beğeni ve yorum gibi etkileşim butonları için yer tutucular bulunur.
 */
export default function PostsFeed() {
  return (
    <div className="flex flex-col gap-8">
      {posts.map((post) => (
        <Card key={post.id} className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
          {/* Kart Başlığı: Kullanıcı bilgileri ve seçenekler butonu */}
          <CardHeader className="flex flex-row items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-white">
                <AvatarImage src={post.user.avatar} />
                <AvatarFallback>{post.user.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-bold">{post.user.name}</p>
                <p className="text-sm text-muted-foreground">{post.timestamp}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <MoreHorizontal />
            </Button>
          </CardHeader>

          {/* Kart İçeriği: Gönderi metni ve resmi */}
          <CardContent className="space-y-4 px-6 pb-2 pt-0">
            <p className="text-base leading-relaxed">{post.text}</p>
            {post.image && (
              <div className="overflow-hidden rounded-2xl">
                <Image
                  src={post.image}
                  alt="Gönderi resmi"
                  width={600}
                  height={400}
                  className="aspect-video w-full object-cover transition-transform duration-300 hover:scale-105"
                  data-ai-hint="sunset landscape"
                />
              </div>
            )}
          </CardContent>

          {/* Kart Alt Bilgisi: Beğeni ve yorum butonları */}
          <CardFooter className="flex items-center justify-start gap-4 p-6 pt-4">
            <Button variant="ghost" className="group rounded-full px-4 text-muted-foreground hover:bg-red-500/10 hover:text-red-500">
              <Heart className="mr-2 transition-colors group-hover:fill-red-500" />
              {post.likes}
            </Button>
            <Button variant="ghost" className="group rounded-full px-4 text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500">
              <MessageCircle className="mr-2" />
              {post.comments}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
