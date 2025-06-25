// src/components/home/NewPost.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send } from "lucide-react";

/**
 * NewPost Bileşeni
 * 
 * Kullanıcının ana sayfada yeni bir gönderi (metin veya resim) oluşturmasını sağlayan alandır.
 * - Kullanıcının avatarını gösterir.
 * - Metin girmesi için bir Textarea alanı bulunur.
 * - Resim yükleme ve gönderme butonları içerir.
 * 
 * Stil: Yumuşak bir arka plan, yuvarlak köşeler ve gölgelerle modern bir kart tasarımı kullanır.
 */
export default function NewPost() {
  // AuthContext'ten mevcut kullanıcı bilgilerini alır.
  const { user } = useAuth();

  return (
    <Card className="w-full rounded-3xl border-0 bg-card/80 p-6 shadow-xl shadow-black/5 backdrop-blur-sm">
      <div className="flex w-full items-start gap-4">
        {/* Kullanıcının avatarı */}
        <Avatar className="h-12 w-12 border-2 border-white">
          <AvatarImage src={user?.photoURL || undefined} />
          <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        {/* Gönderi giriş alanı ve butonları */}
        <div className="flex w-full flex-col gap-4">
          <Textarea
            placeholder="Aklında ne var?"
            className="h-24 resize-none rounded-2xl border-2 border-transparent bg-muted/50 p-4 focus:border-primary focus-visible:ring-0"
            rows={3}
          />
          <div className="flex items-center justify-between">
            {/* Resim Ekle Butonu */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <ImageIcon className="h-6 w-6" />
              <span className="sr-only">Resim Ekle</span>
            </Button>
            
            {/* Gönder Butonu */}
            <Button className="rounded-full px-6 py-3 font-bold shadow-lg shadow-primary/30 transition-transform hover:scale-105">
              <Send className="mr-2 h-4 w-4" />
              Paylaş
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
