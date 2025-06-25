// src/components/posts/PostsFeed.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Post verisinin arayüz (interface) tanımı
export interface Post {
    id: string;
    uid: string;
    username: string;
    userAvatar?: string;
    text: string;
    imageUrl?: string;
    createdAt: Timestamp;
    likes: string[]; // Beğenen kullanıcıların UID'lerini tutan dizi
    likeCount: number;
    commentCount: number;
}

/**
 * PostsFeed Bileşeni
 * 
 * Ana sayfada kullanıcıların gönderilerini listeleyen akış alanıdır.
 * - Firestore'daki 'posts' koleksiyonunu gerçek zamanlı olarak dinler.
 * - Gönderileri oluşturulma tarihine göre en yeniden eskiye doğru sıralar.
 * - Her gönderi için bir PostCard bileşeni oluşturur.
 * - Yükleme durumu ve hiç gönderi olmaması durumlarını yönetir.
 */
export default function PostsFeed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore'dan gönderileri çekmek için useEffect kullanılır
  useEffect(() => {
    // 'posts' koleksiyonuna sorgu oluşturulur, 'createdAt' alanına göre azalan sırada sıralanır.
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));

    // onSnapshot ile koleksiyondaki değişiklikler gerçek zamanlı olarak dinlenir.
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        // Her dökümanı Post arayüzüne uygun bir objeye dönüştürerek diziye ekle
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData); // State'i yeni veriyle güncelle
      setLoading(false); // Yükleme tamamlandı
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    // Bileşen DOM'dan kaldırıldığında (unmount) dinleyiciyi temizle
    return () => unsubscribe();
  }, []); // Boş bağımlılık dizisi sayesinde bu efekt sadece bileşen ilk yüklendiğinde çalışır.

  // Veri yüklenirken gösterilecek olan yükleme animasyonu
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="sr-only">Gönderiler yükleniyor...</p>
      </div>
    );
  }

  // Hiç gönderi yoksa gösterilecek mesaj
  if (!loading && posts.length === 0) {
    return (
        <Card className="text-center p-8 border-dashed rounded-3xl">
          <CardContent className="p-0">
            <h3 className="text-lg font-semibold">Henüz Hiç Gönderi Yok!</h3>
            <p className="text-muted-foreground mt-2">İlk gönderiyi sen paylaşarak etkileşimi başlatabilirsin.</p>
          </CardContent>
        </Card>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      {/* Gelen gönderi verilerini map ile dönerek her biri için bir PostCard oluştur */}
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
