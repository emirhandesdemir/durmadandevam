
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
 * Bu modern tasarımda, metin alanı kartın gövdesine entegre edilmiş ve aksiyon butonları
 * alt kısımda ayrı bir bölümde yer alarak daha temiz bir görünüm sunar.
 */
export default function NewPost() {
  // AuthContext'ten mevcut kullanıcı bilgilerini alır.
  const { user } = useAuth();

  return (
    <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
      {/* Gönderi giriş alanı: Avatar ve metin kutusu */}
      <div className="flex items-start gap-4 p-6">
        <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white">
          <AvatarImage src={user?.photoURL || undefined} />
          <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <Textarea
          placeholder="Aklında ne var?"
          className="h-24 flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
          rows={3}
        />
      </div>
      
      {/* Aksiyon Butonları: Resim ekleme ve gönderme */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-6 py-3">
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
    </Card>
  );
}
