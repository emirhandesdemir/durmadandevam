// src/app/(main)/home/page.tsx
"use client";

// Bileşenleri (components) ayrı dosyalardan içeri aktarıyoruz.
// Bu, kodun daha modüler, yönetilebilir ve yeniden kullanılabilir olmasını sağlar.
import PostsFeed from "@/components/posts/PostsFeed";
import NewPost from '@/components/home/NewPost';

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Sayfa, farklı sorumluluklara sahip iki ana bileşenden oluşur:
 * 
 * 1. NewPost: Kullanıcıyı yeni bir gönderi oluşturma sayfasına yönlendiren bir kart.
 * 2. PostsFeed: Diğer kullanıcıların gönderilerinin listelendiği ana akış alanı.
 * 
 * Bu "bölünmüş sistem" yaklaşımı, her bileşenin kendi mantığına ve görünümüne odaklanmasını sağlar.
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
            Yeni gönderi oluşturma bileşeni (NewPost).
            Bu bileşen, kullanıcıya yeni bir gönderi oluşturması için bir giriş noktası sunar.
            Tıklandığında kullanıcıyı '/create-post' sayfasına yönlendirir.
            Kendi mantığı ve stili src/components/home/NewPost.tsx dosyasında bulunur.
          */}
          <NewPost />
          
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
