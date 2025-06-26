// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addPost } from "@/lib/actions/postActions";
import { applyImageFilter } from "@/lib/actions/imageActions";
import { useRouter } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Send, Loader2, X, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * NewPostForm Bileşeni
 * 
 * Kullanıcının yeni bir gönderi (metin ve/veya resim) oluşturmasını sağlayan formdur.
 * Resim yüklendiğinde metin komutlarıyla yapay zeka destekli düzenleme özelliği içerir.
 */
export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  // State'ler
  const [text, setText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [filteredImagePreview, setFilteredImagePreview] = useState<string | null>(null); // AI ile düzenlenen resim
  const [isLoading, setIsLoading] = useState(false);
  const [isFiltering, setIsFiltering] = useState(false); // AI düzenlemesi yapılıyor mu?
  const [aiPrompt, setAiPrompt] = useState(""); // AI için metin komutu
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dosyayı Base64 Data URI'ye çeviren yardımcı fonksiyon
  const toDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
          toast({ variant: "destructive", description: "Resim boyutu 5MB'dan büyük olamaz." });
          return;
      }
      setImageFile(file);
      setFilteredImagePreview(null); // Yeni resim seçildiğinde filtrelenmişi temizle
      setOriginalImagePreview(URL.createObjectURL(file));
      setAiPrompt(""); // Metin alanını temizle
    }
  };

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageFile(null);
      setOriginalImagePreview(null);
      setFilteredImagePreview(null);
      setAiPrompt("");
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  // AI ile düzenleme fonksiyonu
  const handleApplyAiChanges = async () => {
      if (!imageFile || !aiPrompt.trim() || isFiltering) return;

      setIsFiltering(true);
      toast({ description: `Yapay zeka ile değişiklikler uygulanıyor, lütfen bekleyin...` });

      try {
          const photoDataUri = await toDataURL(imageFile);
          const result = await applyImageFilter({ photoDataUri, style: aiPrompt });
          
          if (result.success && result.data?.styledPhotoDataUri) {
              setFilteredImagePreview(result.data.styledPhotoDataUri);
              toast({ title: "Başarılı!", description: `Resim güncellendi.` });
          } else {
              throw new Error(result.error);
          }
      } catch (error: any) {
          console.error("AI düzenleme hatası:", error);
          toast({ variant: "destructive", description: error.message || "Resim düzenlenirken bir hata oluştu." });
      } finally {
          setIsFiltering(false);
      }
  };

  const handleShare = async () => {
    if (!user) {
      toast({ variant: "destructive", description: "Gönderi paylaşmak için giriş yapmalısınız." });
      return;
    }
    if (!text.trim() && !imageFile) {
      toast({ variant: "destructive", description: "Paylaşmak için bir metin yazın veya resim seçin." });
      return;
    }

    setIsLoading(true);

    try {
      let finalImage: string | null = null;
      if (filteredImagePreview) {
        finalImage = filteredImagePreview;
      } else if (imageFile) {
        finalImage = await toDataURL(imageFile);
      }
      
      await addPost({
        text,
        image: finalImage,
        user: {
          uid: user.uid,
          displayName: user.displayName,
          photoURL: user.photoURL,
        },
        role: userData?.role,
      });
      
      setText("");
      removeImage();
      toast({ description: "Gönderiniz başarıyla paylaşıldı!" });
      router.push('/home');

    } catch (error) {
      console.error("Error creating post:", error);
      toast({ variant: "destructive", description: "Gönderi paylaşılırken bir hata oluştu." });
    } finally {
      setIsLoading(false);
    }
  };

  const currentPreview = filteredImagePreview || originalImagePreview;

  return (
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
                disabled={isLoading || isFiltering}
            />
        </div>
        {currentPreview && (
            <div className="ml-16 space-y-4">
                <div className="relative">
                    <div className="overflow-hidden rounded-xl border">
                        <img src={currentPreview} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                    </div>
                    <Button 
                        size="icon" 
                        variant="destructive" 
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/50 hover:bg-black/70 border-0"
                        onClick={removeImage}
                        disabled={isLoading || isFiltering}
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
                 {/* AI Metin Giriş Alanı */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Wand2 className="h-4 w-4" />
                        <span>AI ile Düzenle</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <Textarea 
                            placeholder="Resme ne yapmak istersin? Örn: 'arkaplana bir kedi ekle', 'çizgi film gibi yap'..."
                            value={aiPrompt}
                            onChange={(e) => setAiPrompt(e.target.value)}
                            className="text-sm"
                            rows={2}
                            disabled={isFiltering || isLoading}
                        />
                        <Button 
                            onClick={handleApplyAiChanges}
                            disabled={!aiPrompt.trim() || isFiltering || isLoading}
                            size="icon"
                            variant="secondary"
                        >
                            {isFiltering ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Wand2 className="h-4 w-4" />
                            )}
                            <span className="sr-only">Uygula</span>
                        </Button>
                    </div>
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
          disabled={isLoading || isFiltering}
        >
          <ImageIcon className="h-5 w-5" />
          <span className="sr-only">Resim Ekle</span>
        </Button>
        
        <Button 
          className="rounded-full"
          size="icon"
          onClick={handleShare}
          disabled={isLoading || (!text.trim() && !imageFile) || isFiltering}
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
          <span className="sr-only">Paylaş</span>
        </Button>
      </div>
    </Card>
  );
}
