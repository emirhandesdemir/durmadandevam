// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { db, storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { applyImageFilter } from "@/lib/actions/imageActions";

import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Send, Loader2, X, Sparkles } from "lucide-react";

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  // Component states
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalCroppedImage, setOriginalCroppedImage] = useState<string | null>(null); // To reset AI changes
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // AI Styling states
  const [stylePrompt, setStylePrompt] = useState('');
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
    setOriginalCroppedImage(croppedDataUrl); // Save the original cropped version
    setImageToCrop(null); // Close the dialog
  }

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageToCrop(null);
      setCroppedImage(null);
      setOriginalCroppedImage(null);
      setStylePrompt('');
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleApplyAiStyle = async () => {
      if (!originalCroppedImage || !stylePrompt.trim() || isStyling) return;
      
      setIsStyling(true);
      try {
          const result = await applyImageFilter({
              photoDataUri: originalCroppedImage,
              style: stylePrompt
          });

          if (result.success && result.data?.styledPhotoDataUri) {
              setCroppedImage(result.data.styledPhotoDataUri);
              toast({ title: "Stil Uygulandı!", description: `"${stylePrompt}" stili başarıyla uygulandı.`});
          } else {
              throw new Error(result.error || "Yapay zeka modelinden geçerli bir yanıt alınamadı.");
          }
      } catch (error: any) {
          toast({
              variant: "destructive",
              title: "Stil Uygulanamadı",
              description: error.message
          });
      } finally {
          setIsStyling(false);
      }
  }

  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız veya verilerinizin yüklenmesini beklemelisiniz.' });
      return;
    }
    if (!text.trim() && !croppedImage) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya resim seçin.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
        let imageUrl = "";
        
        if (croppedImage) {
            const imageRef = ref(storage, `upload/posts/${user.uid}/${Date.now()}_post.jpg`);
            const snapshot = await uploadString(imageRef, croppedImage, 'data_url');
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        await addDoc(collection(db, 'posts'), {
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL || null,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            text: text,
            imageUrl: imageUrl || "",
            imagePublicId: "", // Legacy field, kept for compatibility if needed
            createdAt: serverTimestamp(),
            likes: [],
            likeCount: 0,
            commentCount: 0,
        });

        toast({ title: "Başarıyla Paylaşıldı!", description: "Gönderiniz ana sayfada görünecektir." });
        router.push('/home');

    } catch (error: any) {
        console.error("Gönderi paylaşılırken hata:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Bir Hata Oluştu', 
            description: error.message || 'Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.', 
            duration: 9000 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isStyling;

  return (
    <>
      <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 p-5">
          <div className="flex items-start gap-4">
            <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
              <Avatar className="relative z-[1] h-11 w-11 flex-shrink-0 border-2 border-white">
                <AvatarImage src={user?.photoURL || undefined} />
                <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Aklında ne var? (#etiket) veya (@kullanıcı) bahset..."
              className="min-h-[60px] flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
              rows={2}
              disabled={isLoading}
            />
          </div>
          {croppedImage && (
            <div className="ml-16 space-y-4">
              <div className="relative">
                <div className="overflow-hidden rounded-xl border">
                  <img src={croppedImage} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                  {isStyling && (
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2 text-white">
                        <Loader2 className="h-8 w-8 animate-spin"/>
                        <p>Stil uygulanıyor...</p>
                    </div>
                  )}
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

              {/* AI Styling Section */}
              <div className="space-y-2">
                <Label htmlFor="ai-style-prompt" className="flex items-center gap-2 font-semibold">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI ile Stil Ver
                </Label>
                <div className="flex items-center gap-2">
                    <Input 
                        id="ai-style-prompt"
                        placeholder="ör., suluboya resim yap, arka planı kaldır..."
                        value={stylePrompt}
                        onChange={(e) => setStylePrompt(e.target.value)}
                        disabled={isLoading}
                    />
                    <Button onClick={handleApplyAiStyle} disabled={isLoading || !stylePrompt.trim()}>
                        {isStyling ? <Loader2 className="h-4 w-4 animate-spin"/> : "Uygula"}
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
            disabled={isLoading || !!croppedImage}
          >
            <ImageIcon className="h-5 w-5" />
            <span className="sr-only">Resim Ekle</span>
          </Button>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isLoading || (!text.trim() && !croppedImage)}
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
        aspectRatio={1}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
