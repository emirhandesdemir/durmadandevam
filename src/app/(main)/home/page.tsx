// src/app/(main)/home/page.tsx
"use client";

import PostsFeed from "@/components/posts/PostsFeed";
import NewPost from '@/components/home/NewPost';

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Sayfa, yeni gönderi oluşturma alanı ve diğer kullanıcıların gönderilerinin
 * listelendiği akıştan (PostsFeed) oluşur.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        {/* Ana sayfanın dikey düzenini ve bileşenler arası boşluğu yöneten ana sarmalayıcı */}
        <div className="flex flex-col gap-8">
          {/* Yeni gönderi oluşturma alanı */}
          <NewPost />
          {/* Gönderi akışı */}
          <PostsFeed />
        </div>
      </main>
    </div>
  );
}
