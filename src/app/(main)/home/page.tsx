// src/app/(main)/home/page.tsx
"use client";

// Bileşenleri (components) ayrı dosyalardan içeri aktarıyoruz.
// Bu, kodun daha modüler, yönetilebilir ve yeniden kullanılabilir olmasını sağlar.
import PostsFeed from "@/components/posts/PostsFeed";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Sayfa, artık sadece diğer kullanıcıların gönderilerinin listelendiği ana akış alanından oluşmaktadır.
 * Yeni gönderi oluşturma işlemi, üst menüdeki (+) butonu ile gerçekleştirilir.
 */
export default function HomePage() {
  return (
    // Sayfanın ana sarmalayıcısı, arka plan rengini ve minimum yüksekliği ayarlar.
    <div className="min-h-screen bg-background text-foreground">
      {/* 'container' sınıfı, içeriği ortalar ve maksimum genişlik belirler. */}
      <main className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        
        {/* Ana sayfanın dikey düzenini ve bileşenler arası boşluğu yöneten sarmalayıcı */}
        <div className="flex flex-col gap-8">
          
          {/* 
            Gönderi akışı bileşeni (PostsFeed).
            Bu bileşen, Firestore veritabanından gönderileri çeker ve listeler.
            Her gönderi, kendi içinde bir 'PostCard' bileşeni olarak oluşturulur.
            Tüm gönderi akışı mantığı src/components/posts/PostsFeed.tsx dosyasındadır.
          */}
          <PostsFeed />
          
        </div>
      </main>
    </div>
  );
}
