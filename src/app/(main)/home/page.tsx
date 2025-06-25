
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";

/**
 * Ana sayfa bileşeni.
 * "Oda Oluştur" kartını ve mevcut odaların listesini içerir.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <CreateRoomCard />
          <RoomList />
        </div>
      </main>
    </div>
  );
}
