
// src/app/admin/posts/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FileText, Loader2 } from "lucide-react";
import PostsTable from "@/components/admin/PostsTable";

// Yönetici panelinde gösterilecek gönderi verisi için arayüz.
export interface AdminPostData {
    id: string;
    uid: string;
    username: string;
    text: string;
    imageUrl?: string;
    createdAt: Timestamp;
    likeCount: number;
    commentCount: number;
}

/**
 * Yönetim Paneli - Gönderi Yöneticisi Sayfası
 * 
 * Firestore'daki tüm gönderileri listeler ve yöneticinin bu gönderileri
 * görüntülemesi ve silmesi için bir arayüz sağlar.
 */
export default function PostManagerPage() {
    const [posts, setPosts] = useState<AdminPostData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Gönderileri en yeniden en eskiye doğru sıralayarak getir.
        const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
        
        // `onSnapshot` ile koleksiyonu dinle, böylece yeni gönderiler veya
        // değişiklikler anında arayüze yansır.
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const postsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdminPostData));
            setPosts(postsData);
            setLoading(false);
        }, (error) => {
            console.error("Gönderileri çekerken hata:", error);
            setLoading(false);
        });

        // Component unmount olduğunda dinleyiciyi temizle.
        return () => unsubscribe();
    }, []);

  return (
    <div>
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gönderi Yöneticisi</h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcı gönderilerini yönetin, düzenleyin veya kaldırın.
          </p>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
            <div className="flex justify-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        ) : (
            <PostsTable posts={posts} />
        )}
      </div>
    </div>
  );
}
