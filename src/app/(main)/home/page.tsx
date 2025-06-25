
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

import WelcomeCard from "@/components/home/WelcomeCard";
import CreatePost from "@/components/home/CreatePost";
import PostsFeed from "@/components/home/PostsFeed";
import ActiveRooms from "@/components/home/ActiveRooms";


export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading) {
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    );
  }

  if (!user) {
    // Bu durum normalde AuthContext tarafından ele alınır, ancak ek bir güvenlik katmanıdır.
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/20">
      <main className="container mx-auto grid grid-cols-12 gap-x-8 px-4 py-8">
        {/* Ana İçerik - Gönderi Akışı */}
        <div className="col-span-12 lg:col-span-8">
          <section className="space-y-6">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Akış
            </h2>
            <CreatePost />
            <PostsFeed />
          </section>
        </div>

        {/* Sağ Kenar Çubuğu - Hoşgeldin ve Aktif Odalar */}
        <div className="col-span-12 mt-8 lg:col-span-4 lg:mt-0">
          <aside className="sticky top-8 space-y-6">
            <WelcomeCard name={user.displayName || "Kullanıcı"} />
            <ActiveRooms />
          </aside>
        </div>
      </main>
    </div>
  );
}
