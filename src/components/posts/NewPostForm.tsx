// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { applyImageFilter } from "@/lib/actions/imageActions";
import { createPost } from "@/lib/actions/postActions";

import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Image as ImageIcon, Send, Loader2, X, Sparkles, ArrowUp, RefreshCcw } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface AiChatMessage {
  id: number;
  role: 'user' | 'ai' | 'system';
  text?: string;
  imageUrl?: string;
  isLoading?: boolean;
}

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  
  // Component states
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalCroppedImage, setOriginalCroppedImage] = useState<string | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasEditedByAI, setWasEditedByAI] = useState(false);
  
  // AI Styling states
  const [stylePrompt, setStylePrompt] = useState('');
  const [isStyling, setIsStyling] = useState(false);
  const [aiChatHistory, setAiChatHistory] = useState<AiChatMessage[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (croppedImage && aiChatHistory.length === 0) {
        setAiChatHistory([
            {
                id: Date.now(),
                role: 'system',
                text: 'Resminiz hazır! Ona nasıl bir stil uygulamamı istersiniz? Örneğin, "suluboya resim yap" veya "arka planı uzay yap" gibi komutlar verebilirsiniz.'
            }
        ]);
    }
  }, [croppedImage, aiChatHistory.length]);

  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [aiChatHistory]);

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
    setOriginalCroppedImage(croppedDataUrl); 
    setImageToCrop(null);
  }

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageToCrop(null);
      setCroppedImage(null);
      setOriginalCroppedImage(null);
      setStylePrompt('');
      setAiChatHistory([]);
      setWasEditedByAI(false);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleApplyAiStyle = async () => {
      if (!croppedImage || !stylePrompt.trim() || isStyling) return;
      
      setIsStyling(true);
      const userPrompt = stylePrompt;
      setStylePrompt('');

      setAiChatHistory(prev => [
          ...prev,
          { id: Date.now(), role: 'user', text: userPrompt },
          { id: Date.now() + 1, role: 'ai', isLoading: true }
      ]);
      
      try {
          const result = await applyImageFilter({
              photoDataUri: croppedImage,
              style: userPrompt
          });

          if (result.success && result.data?.styledPhotoDataUri) {
              setCroppedImage(result.data.styledPhotoDataUri);
              setWasEditedByAI(true);
              setAiChatHistory(prev => [
                  ...prev.filter(msg => !msg.isLoading),
                  { id: Date.now(), role: 'ai', imageUrl: result.data.styledPhotoDataUri }
              ]);
          } else {
              throw new Error(result.error || "Yapay zeka modelinden geçerli bir yanıt alınamadı.");
          }
      } catch (error: any) {
          setAiChatHistory(prev => [
              ...prev.filter(msg => !msg.isLoading),
              { id: Date.now(), role: 'system', text: `Bir hata oluştu: ${error.message}` }
          ]);
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

        await createPost({
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL || null,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            text: text,
            imageUrl: imageUrl || "",
            editedWithAI: wasEditedByAI,
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
            <div className="ml-0 sm:ml-16 space-y-4">
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

              {/* AI Styling Chat Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label className="flex items-center gap-2 font-semibold">
                        <Sparkles className="h-5 w-5 text-primary" />
                        AI Sohbet Asistanı
                    </Label>
                    <Button variant="ghost" size="sm" onClick={() => { setCroppedImage(originalCroppedImage); setWasEditedByAI(false); }} disabled={isLoading}>
                        <RefreshCcw className="h-3 w-3 mr-2"/>
                        Sıfırla
                    </Button>
                </div>
                <div className="border rounded-xl h-80 flex flex-col bg-muted/30">
                    <ScrollArea className="flex-1" ref={chatContainerRef}>
                        <div className="p-3 space-y-4">
                            {aiChatHistory.map((msg) => (
                                <div key={msg.id} className={cn("flex items-end gap-2", msg.role === 'user' && "justify-end")}>
                                    {msg.role === 'ai' && <Avatar className="h-6 w-6 bg-primary/20 text-primary flex items-center justify-center"><Sparkles className="h-4 w-4" /></Avatar>}
                                    {msg.role === 'system' && <div className="w-6 h-6 shrink-0"/>}
                                    <div className={cn(
                                        "max-w-[85%] rounded-lg p-2 text-sm",
                                        msg.role === 'user' && "bg-primary text-primary-foreground",
                                        msg.role === 'ai' && "bg-card",
                                        msg.role === 'system' && "w-full text-center text-xs bg-transparent text-muted-foreground p-1"
                                    )}>
                                        {msg.isLoading && <Loader2 className="h-5 w-5 animate-spin p-1" />}
                                        {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                                        {msg.imageUrl && <img src={msg.imageUrl} className="rounded-md" alt="AI styled" />}
                                    </div>
                                    {msg.role === 'user' && <Avatar className="h-6 w-6"><AvatarImage src={user?.photoURL || undefined}/><AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback></Avatar>}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                    <div className="relative mt-auto p-2 border-t">
                        <Textarea
                            placeholder="Resme bir stil uygula..."
                            value={stylePrompt}
                            onChange={(e) => setStylePrompt(e.target.value)}
                            disabled={isLoading}
                            className="rounded-full px-4 pr-12 min-h-[40px] resize-none"
                            rows={1}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleApplyAiStyle();
                                }
                            }}
                        />
                        <Button
                            type="button"
                            size="icon"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                            onClick={handleApplyAiStyle}
                            disabled={isLoading || !stylePrompt.trim()}
                            aria-label="Stili uygula"
                        >
                            {isStyling ? <Loader2 className="h-4 w-4 animate-spin"/> : <ArrowUp className="h-4 w-4" />}
                        </Button>
                    </div>
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
