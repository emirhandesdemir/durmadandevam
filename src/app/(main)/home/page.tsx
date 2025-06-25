// src/app/(main)/home/page.tsx

import ActiveRooms from "@/components/home/ActiveRooms";
import NewPost from "@/components/home/NewPost";
import PostsFeed from "@/components/home/PostsFeed";
import WelcomeCard from "@/components/home/WelcomeCard";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Sayfa, 4 ana bileşenden oluşur:
 * 1. WelcomeCard: Kullanıcıyı karşılayan ve hızlı aksiyon butonları sunan kart.
 * 2. NewPost: Kullanıcının yeni gönderi oluşturabileceği alan.
 * 3. PostsFeed: Diğer kullanıcıların gönderilerinin listelendiği akış.
 * 4. ActiveRooms: Aktif sohbet odalarının gösterildiği bölüm.
 * 
 * Bu bileşenler, sayfanın daha modüler ve yönetilebilir olmasını sağlar.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-3xl px-4 py-6 md:py-8">
        {/* Ana sayfanın dikey düzenini ve bileşenler arası boşluğu yöneten ana sarmalayıcı */}
        <div className="flex flex-col gap-8">
          {/* 1. Kullanıcıyı karşılama kartı */}
          <WelcomeCard />

          {/* 2. Yeni gönderi oluşturma alanı */}
          <NewPost />

          {/* 3. Gönderi akışı */}
          <PostsFeed />

          {/* 4. Aktif odalar listesi */}
          <ActiveRooms />
        </div>
      </main>
    </div>
  );
}
