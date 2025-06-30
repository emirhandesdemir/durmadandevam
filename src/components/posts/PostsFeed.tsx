// src/components/posts/PostsFeed.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, where, Query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PostCard from "./PostCard";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import type { Post } from "@/lib/types";


/**
 * PostsFeed Bileşeni
 * 
 * Ana sayfada kullanıcıların gönderilerini listeleyen akış alanıdır.
 * - Firestore'daki 'posts' koleksiyonunu gerçek zamanlı olarak dinler.
 * - Kullanıcının cinsiyetine göre akışı kişiselleştirir.
 * - Gönderileri oluşturulma tarihine göre en yeniden eskiye doğru sıralar.
 * - Her gönderi için bir PostCard bileşeni oluşturur.
 */
export default function PostsFeed() {
  const { userData } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore'dan gönderileri çekmek için useEffect kullanılır
  useEffect(() => {
    setLoading(true);
    
    // userData yüklenene kadar beklemeye gerek yok, null ise varsayılan sorguyu kullanırız.
    const postsCollection = collection(db, "posts");
    let postsQuery: Query;

    if (userData?.gender === 'male') {
        // Erkek kullanıcılar için sadece kadınların gönderilerini göster
        postsQuery = query(postsCollection, where("userGender", "==", "female"), orderBy("createdAt", "desc"));
    } else {
        // Kadın kullanıcılar, cinsiyeti belirtilmemiş veya giriş yapmamış kullanıcılar için tüm gönderileri göster
        postsQuery = query(postsCollection, orderBy("createdAt", "desc"));
    }
    
    // onSnapshot ile koleksiyondaki değişiklikler gerçek zamanlı olarak dinlenir.
    const unsubscribe = onSnapshot(postsQuery, (querySnapshot) => {
      const postsData: Post[] = [];
      querySnapshot.forEach((doc) => {
        postsData.push({ id: doc.id, ...doc.data() } as Post);
      });
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching posts:", error);
        setLoading(false);
    });

    // Bileşen DOM'dan kaldırıldığında (unmount) dinleyiciyi temizle
    return () => unsubscribe();
  }, [userData]); // userData değiştiğinde (login sonrası vb.) sorguyu yeniden çalıştır

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
        <Card className="text-center p-8 border-dashed rounded-3xl m-4">
          <CardContent className="p-0">
            <h3 className="text-lg font-semibold">Henüz Hiç Gönderi Yok!</h3>
            <p className="text-muted-foreground mt-2">İlk gönderiyi sen paylaşarak etkileşimi başlatabilirsin.</p>
          </CardContent>
        </Card>
      );
  }

  return (
    <div className="flex flex-col w-full">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  );
}
