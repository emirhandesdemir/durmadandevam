
// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Send, Loader2, X, Sparkles } from "lucide-react";
import { applyImageFilter } from "@/lib/actions/imageActions";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";


export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [stylePrompt, setStylePrompt] = useState("");
  const [isStyling, setIsStyling] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setImageToCrop(null); // Kırpıcıyı kapat
  }

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

  const handleApplyStyle = async () => {
    if (!croppedImage) {
        toast({ variant: 'destructive', description: "Lütfen önce bir resim seçip kırpın."});
        return;
    }
    if (!stylePrompt.trim()) {
        toast({ variant: 'destructive', description: "Lütfen stil için bir komut girin."});
        return;
    }
    setIsStyling(true);
    try {
        const result = await applyImageFilter({
            photoDataUri: croppedImage,
            style: stylePrompt,
        });
        if (result.success && result.data?.styledPhotoDataUri) {
            setCroppedImage(result.data.styledPhotoDataUri);
            setStylePrompt("");
            toast({ title: "Başarılı!", description: "Yapay zeka filtresi uygulandı."});
        } else {
            throw new Error(result.error || "Stil uygulanamadı.");
        }
    } catch (error: any) {
        console.error("AI styling error:", error);
        toast({ variant: 'destructive', title: "Hata", description: error.message || "Yapay zeka stili uygulanırken bir sorun oluştu."});
    } finally {
        setIsStyling(false);
    }
  }

  const handleShare = async () => {
    if (!user) {
        toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız.', duration: 5000 });
        router.push('/login');
        return;
    }
    if (!userData) {
        toast({ variant: 'destructive', title: 'Veri Yükleniyor', description: 'Kullanıcı profiliniz henüz yüklenmedi. Lütfen bir saniye sonra tekrar deneyin.', duration: 5000 });
        return;
    }
    if (!text.trim() && !croppedImage) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya resim seçin.', duration: 5000 });
      return;
    }

    setIsSubmitting(true);
    
    try {
        let imageUrl = "";

        if (croppedImage) {
            const imageRef = ref(storage, `posts/${user.uid}/${Date.now()}_post.jpg`);
            // data_url ile uploadString kullanarak yükleme yapılıyor.
            const snapshot = await uploadString(imageRef, croppedImage, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        const postData = {
            uid: user.uid,
            username: userData.username || user.displayName || 'Anonim Kullanıcı',
            userAvatar: userData.photoURL || user.photoURL,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            text: text,
            imageUrl: imageUrl, 
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
        };

        await addDoc(collection(db, 'posts'), postData);

        toast({
            title: "Başarıyla Paylaşıldı!",
            description: "Gönderiniz ana sayfada görünecektir.",
        });
        router.push('/home');

    } catch (error) {
        console.error("Gönderi paylaşılırken detaylı hata:", error);
        let title = "Bir Hata Oluştu";
        let description = "Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.";

        if (error instanceof FirebaseError) {
            switch (error.code) {
                case 'storage/unauthorized':
                    title = 'Depolama Yetki Hatası';
                    description = 'Resminiz yüklenemedi. Lütfen Firebase projenizdeki Storage Kurallarını kontrol edin.';
                    break;
                case 'storage/retry-limit-exceeded':
                    title = 'Yükleme Zaman Aşımı';
                    description = 'Resim yüklenemedi. Ağ bağlantınız yavaş olabilir. Lütfen daha sonra tekrar deneyin.';
                    break;
                case 'storage/canceled':
                    title = 'Yükleme İptal Edildi';
                    description = 'Resim yükleme işlemi ağ sorunu nedeniyle iptal edildi.';
                    break;
                case 'permission-denied':
                    title = 'Veritabanı Yetki Hatası';
                    description = 'Veritabanına yazma izniniz yok. Lütfen Firestore güvenlik kurallarınızı kontrol edin.';
                    break;
                default:
                    title = `Hata Kodu: ${error.code}`;
                    description = `Beklenmedik bir hata oluştu: ${error.message}`;
            }
        } else if (error instanceof Error) {
            description = error.message;
        }
        
        toast({
            variant: 'destructive',
            title: title,
            description: description,
            duration: 9000
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
              disabled={isSubmitting || isStyling}
            />
          </div>
          <div className="space-y-4">
            {croppedImage && (
              <div className="space-y-4">
                <div className="relative">
                  <div className="overflow-hidden rounded-xl border">
                    <img src={croppedImage} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                     {isStyling && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl">
                        <Loader2 className="h-8 w-8 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <Button 
                    size="icon" 
                    variant="destructive" 
                    className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border-0"
                    onClick={removeImage}
                    disabled={isSubmitting || isStyling}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 rounded-xl border border-primary/20 bg-gradient-to-tr from-card to-muted/20 p-4 shadow-inner">
                  <div className="flex items-center gap-2.5">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-foreground">Yapay Zeka ile Stil Ver</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Resminize yaratıcı bir dokunuş ekleyin. "Van Gogh tarzı" veya "çizgi film yap" gibi komutlar deneyin.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                      <Input
                          id="style-prompt"
                          value={stylePrompt}
                          onChange={(e) => setStylePrompt(e.target.value)}
                          placeholder="Örn: bir sulu boya tablosu yap"
                          className="flex-1 bg-background/50"
                          disabled={isStyling || isSubmitting}
                      />
                      <Button onClick={handleApplyStyle} disabled={isStyling || isSubmitting || !stylePrompt.trim()}>
                          {isStyling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                          Uygula
                      </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2">
          <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
          
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={handleImageClick}
            disabled={isSubmitting || !!croppedImage || isStyling}
          >
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">Resim Ekle</span>
          </Button>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isSubmitting || (!text.trim() && !croppedImage) || isStyling}
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
