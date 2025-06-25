// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send, Loader2, X } from "lucide-react";

/**
 * NewPostForm Bileşeni
 * 
 * Kullanıcının ana sayfada yeni bir gönderi (metin ve/veya resim) oluşturmasını sağlayan formdur.
 * Kullanıcı metin girebilir, bir resim dosyası seçebilir ve gönderiyi paylaşabilir.
 * Paylaşım sırasında yükleme durumu gösterilir ve işlem bitince form sıfırlanır.
 */
export default function NewPostForm() {
  const { user } = useAuth(); // Mevcut kullanıcı bilgilerini al
  const { toast } = useToast(); // Bildirimler için hook
  
  const [text, setText] = useState(""); // Metin alanının state'i
  const [imageFile, setImageFile] = useState<File | null>(null); // Seçilen resim dosyasının state'i
  const [imagePreview, setImagePreview] = useState<string | null>(null); // Resim önizlemesi için URL state'i
  const [isLoading, setIsLoading] = useState(false); // Yükleme durumu state'i
  
  const fileInputRef = useRef<HTMLInputElement>(null); // Gizli dosya girişi için referans

  // Resim seçildiğinde tetiklenir
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file); // Dosyayı state'e kaydet
      setImagePreview(URL.createObjectURL(file)); // Önizleme için geçici URL oluştur
    }
  };

  // Resim ekle ikonuna tıklandığında gizli dosya girişini tetikler
  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  // Önizlemeyi ve seçilen dosyayı kaldırır
  const removeImage = () => {
      setImageFile(null);
      setImagePreview(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  // Gönderiyi paylaşma fonksiyonu
  const handleShare = async () => {
    if (!user) {
      toast({ variant: "destructive", description: "Gönderi paylaşmak için giriş yapmalısınız." });
      return;
    }
    if (!text.trim() && !imageFile) {
      toast({ variant: "destructive", description: "Paylaşmak için bir metin yazın veya resim seçin." });
      return;
    }

    setIsLoading(true); // Yüklemeyi başlat

    try {
      let imageUrl = "";
      // Eğer bir resim dosyası seçildiyse, Firebase Storage'a yükle
      if (imageFile) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(snapshot.ref); // Yüklenen resmin URL'ini al
      }

      // Yeni gönderi dökümanını Firestore'a ekle
      await addDoc(collection(db, "posts"), {
        uid: user.uid,
        username: user.displayName,
        userAvatar: user.photoURL,
        text: text,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
      });

      // Formu sıfırla ve başarı bildirimi göster
      setText("");
      removeImage();
      toast({ description: "Gönderiniz başarıyla paylaşıldı!" });

    } catch (error) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", description: "Gönderi paylaşılırken bir hata oluştu." });
    } finally {
      setIsLoading(false); // Yüklemeyi bitir
    }
  };

  return (
    <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
      {/* Gönderi giriş alanı: Avatar ve metin kutusu */}
      <div className="flex flex-col gap-4 p-6">
        <div className="flex items-start gap-4">
            <Avatar className="h-12 w-12 flex-shrink-0 border-2 border-white">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Aklında ne var?"
                className="h-24 flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
                rows={3}
                disabled={isLoading}
            />
        </div>
        {/* Resim önizleme alanı */}
        {imagePreview && (
            <div className="relative ml-16">
                <img src={imagePreview} alt="Önizleme" className="max-h-60 rounded-xl object-cover" />
                <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute top-2 right-2 h-7 w-7 rounded-full"
                    onClick={removeImage}
                    disabled={isLoading}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        )}
      </div>
      
      {/* Aksiyon Butonları: Resim ekleme ve gönderme */}
      <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-6 py-3">
        {/* Gizli dosya girişi */}
        <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
        
        {/* Resim Ekle Butonu */}
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
          onClick={handleImageClick}
          disabled={isLoading}
        >
          <ImageIcon className="h-6 w-6" />
          <span className="sr-only">Resim Ekle</span>
        </Button>
        
        {/* Gönder Butonu */}
        <Button 
          className="rounded-full px-6 py-3 font-bold shadow-lg shadow-primary/30 transition-transform hover:scale-105"
          onClick={handleShare}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Send className="mr-2 h-4 w-4" />
          )}
          {isLoading ? "Paylaşılıyor..." : "Paylaş"}
        </Button>
      </div>
    </Card>
  );
}
