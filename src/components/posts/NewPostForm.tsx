// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { FirebaseError } from "firebase/app";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send, Loader2, X } from "lucide-react";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
          toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Resim boyutu 5MB'dan büyük olamaz." });
          return;
      }
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageToCrop(null);
      setCroppedImage(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setImageToCrop(null);
  }

  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Gönderi paylaşmak için giriş yapmalısınız.' });
      return;
    }
    if (!text.trim() && !croppedImage) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya resim seçin.' });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl = '';

      if (croppedImage) {
        const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_post.jpg`);
        const snapshot = await uploadString(imageRef, croppedImage, 'data_url');
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await addDoc(collection(db, 'posts'), {
        uid: user.uid,
        username: userData.username || user.displayName || 'Anonim Kullanıcı',
        userAvatar: userData.photoURL || user.photoURL,
        userRole: userData.role || 'user',
        text: text,
        imageUrl: imageUrl,
        createdAt: serverTimestamp(),
        likes: [],
        likeCount: 0,
        commentCount: 0,
      });

      toast({
        title: "Paylaşıldı!",
        description: "Gönderiniz başarıyla oluşturuldu.",
      });
      router.push('/home');

    } catch (error) {
      console.error("Gönderi oluşturulurken hata:", error);
      let description = 'Paylaşım sırasında bir hata oluştu. Lütfen internet bağlantınızı kontrol edip tekrar deneyin.';
      
      if (error instanceof FirebaseError) {
        if (error.code === 'storage/unauthorized') {
          description = 'Resim yükleme izniniz yok. Lütfen Firebase Storage güvenlik kurallarınızı kontrol edin.';
        } else if (error.code === 'permission-denied') {
          description = 'Veritabanına yazma izniniz yok. Lütfen Firestore güvenlik kurallarınızı kontrol edin.';
        }
      }
      
      toast({
        variant: 'destructive',
        title: 'Paylaşım Başarısız',
        description: description,
        duration: 9000,
      });

    } finally {
      setIsSubmitting(false);
    }
  };


  return (
    <>
      <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-11 w-11 flex-shrink-0 border-2 border-white">
              <AvatarImage src={user?.photoURL || undefined} />
              <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Aklında ne var? (#etiket) veya (@kullanıcı) bahset..."
              className="min-h-[60px] flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
              rows={2}
              disabled={isSubmitting}
            />
          </div>
          {croppedImage && (
            <div className="ml-16 space-y-4">
              <div className="relative">
                <div className="overflow-hidden rounded-xl border">
                  <img src={croppedImage} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                </div>
                <Button 
                  size="icon" 
                  variant="destructive" 
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border-0"
                  onClick={removeImage}
                  disabled={isSubmitting}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2">
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={handleImageClick}
            disabled={isSubmitting || !!croppedImage}
          >
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">Resim Ekle</span>
          </Button>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isSubmitting || (!text.trim() && !croppedImage)}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="ml-2 hidden sm:inline">Paylaş</span>
          </Button>
        </div>
      </Card>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)}
        imageSrc={imageToCrop}
        aspectRatio={16 / 9}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
