// src/app/(main)/home/page.tsx
"use client";

import PostsFeed from "@/components/posts/PostsFeed";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Tüm kullanıcıların gönderilerini tek bir akışta sunar.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground pt-4">
        <div className="flex flex-col items-center gap-4">
            <PostsFeed />
        </div>
    </div>
  );
}
