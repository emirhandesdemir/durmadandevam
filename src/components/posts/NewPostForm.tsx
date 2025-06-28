// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { db, storage } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { FirebaseError } from "firebase/app";

import { compressImage } from "@/lib/imageUtils";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send, Loader2, X, Cog } from "lucide-react";

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bellek sızıntılarını önlemek için önizleme URL'sini temizle
  useEffect(() => {
    return () => {
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { 
          toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Resim boyutu 10MB'dan büyük olamaz." });
          return;
      }
      const reader = new FileReader();
      reader.onload = () => {
          setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    setImageToCrop(null); // Kırpıcıyı hemen kapat
    setIsProcessingImage(true);
    try {
        const blob = await compressImage(croppedDataUrl);
        setImageBlob(blob);
        setImagePreviewUrl(URL.createObjectURL(blob));
    } catch(error: any) {
        console.error("Resim işlenirken hata:", error);
        toast({ variant: "destructive", title: "Hata", description: `Resim işlenemedi: ${error.message}` });
        removeImage();
    } finally {
        setIsProcessingImage(false);
    }
  }

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageToCrop(null);
      setImageBlob(null);
      if (imagePreviewUrl) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      setImagePreviewUrl(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız veya verilerinizin yüklenmesini beklemelisiniz.' });
      return;
    }
    if (!text.trim() && !imageBlob) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya resim seçin.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
        let imageUrl = "";
        if (imageBlob) {
            const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_post.jpg`);
            const snapshot = await uploadBytes(imageRef, imageBlob);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        await addDoc(collection(db, 'posts'), {
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            text,
            imageUrl,
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
        });

        toast({ title: "Başarıyla Paylaşıldı!", description: "Gönderiniz ana sayfada görünecektir." });
        router.push('/home');

    } catch (error) {
        console.error("Gönderi paylaşılırken detaylı hata:", error);
        let description = "Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.";
        if (error instanceof FirebaseError) {
             if (error.code === 'storage/retry-limit-exceeded') {
                description = 'Resim yüklenemedi, ağ bağlantınız yavaş olabilir. Lütfen daha sonra tekrar deneyin.';
             } else if (error.code === 'storage/unauthorized') {
                description = 'Resim yükleme yetkiniz yok. Lütfen Firebase projenizdeki Storage Kurallarını kontrol edin.';
             } else if (error.code.includes('permission-denied')) {
                description = 'Veritabanına veya depolamaya yazma izniniz yok. Lütfen Firebase güvenlik kurallarınızı kontrol edin.';
             }
        }
        toast({ variant: 'destructive', title: 'Bir Hata Oluştu', description, duration: 9000 });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isProcessingImage || isSubmitting;

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
              disabled={isLoading}
            />
          </div>
          {imagePreviewUrl && (
            <div className="relative ml-16">
              <div className="overflow-hidden rounded-xl border">
                <img src={imagePreviewUrl} alt="Önizleme" className="max-h-80 w-auto object-contain" />
              </div>
              <Button 
                size="icon" 
                variant="destructive" 
                className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border-0"
                onClick={removeImage}
                disabled={isLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {isProcessingImage && (
             <div className="ml-16 flex items-center gap-2 text-muted-foreground">
                <Cog className="h-5 w-5 animate-spin" />
                <span>Resim işleniyor, lütfen bekleyin...</span>
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
            disabled={isLoading || !!imageBlob}
          >
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">Resim Ekle</span>
          </Button>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isLoading || (!text.trim() && !imageBlob)}
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
