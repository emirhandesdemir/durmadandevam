// src/app/(main)/rooms/page.tsx
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";

/**
 * Odalar Sayfası (Rooms Page)
 * 
 * Bu sayfa, kullanıcıların yeni sohbet odaları oluşturabileceği
 * ve mevcut tüm odaları listeleyebileceği merkezi alandır.
 * - Üstte renkli bir "Oda Oluştur" kartı bulunur.
 * - Altında mevcut odaların listesi (RoomList) yer alır.
 */
export default function RoomsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-8">
          {/* 1. Yeni oda oluşturma ve karşılama kartı */}
          <CreateRoomCard />

          {/* 2. Mevcut odaların listesi */}
          <RoomList />
        </div>
      </main>
    </div>
  );
}
