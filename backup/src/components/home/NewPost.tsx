// src/components/home/NewPost.tsx
"use client";

import Link from 'next/link';
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon } from "lucide-react";

/**
 * NewPost Bileşeni
 * 
 * Ana sayfada, kullanıcıyı yeni bir gönderi oluşturma sayfasına yönlendiren
 * bir giriş noktası (entry-point) olarak hizmet verir. Tıklanabilir bir karttır.
 * Kullanıcı avatarını, "Aklında ne var?" metnini ve bir resim ikonu içerir.
 */
export default function NewPost() {
  const { user } = useAuth();

  // Kullanıcı giriş yapmamışsa bu bileşeni gösterme
  if (!user) {
    return null;
  }

  return (
    // Tüm kart, gönderi oluşturma sayfasına bir bağlantıdır.
    <Link href="/create-post" className="block w-full" aria-label="Yeni gönderi oluştur">
        <Card className="group w-full cursor-pointer overflow-hidden rounded-2xl border bg-card/50 p-4 shadow-lg shadow-black/5 transition-colors hover:border-primary/50 hover:bg-card">
            <div className="flex items-center gap-4">
                {/* Kullanıcı Avatarı */}
                <Avatar className="h-11 w-11 flex-shrink-0">
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                
                {/* Sahte Giriş Alanı */}
                <div className="flex-1 text-left text-muted-foreground">
                    Aklında ne var, {user.displayName?.split(' ')[0] || 'dostum'}?
                </div>
                
                {/* Resim İkonu */}
                <div className="rounded-full bg-muted p-3">
                    <ImageIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                </div>
            </div>
        </Card>
    </Link>
  );
}
