// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { applyImageFilter } from "@/lib/actions/imageActions";
import { checkImageSafety } from "@/lib/actions/moderationActions";
import { createPost } from "@/lib/actions/postActions";
import { getFollowingForSuggestions } from "@/lib/actions/userActions";
import type { UserProfile } from "@/lib/types";

import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Image as ImageIcon, Send, Loader2, X, Sparkles, RefreshCcw, MessageCircleOff, HeartOff } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { useTranslation } from "react-i18next";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

// Helper function to convert data URI to Blob for more robust uploads
async function dataUriToBlob(dataUri: string): Promise<Blob> {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
}

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData, featureFlags } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  const [text, setText] = useState("");
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalCroppedImage, setOriginalCroppedImage] = useState<string | null>(null); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasEditedByAI, setWasEditedByAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention States
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Post Settings
  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [likesHidden, setLikesHidden] = useState(false);

  // AI Edit States
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isModerating, setIsModerating] = useState(false);

  useEffect(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    let initialText = '';
    if (sharedTitle) {
      initialText += sharedTitle + '\n';
    }
    if (sharedText) {
      initialText += sharedText + '\n';
    }
    if (sharedUrl) {
      initialText += sharedUrl;
    }

    if (initialText) {
      setText(initialText.trim());
    }
  }, [searchParams]);

  const fetchSuggestions = useCallback(async () => {
    if (!userData || suggestions.length > 0) return;
    setSuggestionLoading(true);
    try {
        const followingList = await getFollowingForSuggestions(userData.uid);
        setSuggestions(followingList);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
    } finally {
        setSuggestionLoading(false);
    }
  }, [userData, suggestions.length]);


  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);

    const cursorPos = e.target.selectionStart;
    const textUpToCursor = value.substring(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);

    if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        fetchSuggestions();
    } else {
        setMentionQuery(null);
    }
    setActiveSuggestionIndex(0);
  };

  const handleMentionSelect = (username: string) => {
    if (!textareaRef.current) return;
    const value = textareaRef.current.value;
    const cursorPos = textareaRef.current.selectionStart;
    const textUpToCursor = value.substring(0, cursorPos);

    const startIndex = textUpToCursor.lastIndexOf('@');
    if (startIndex === -1) return;

    const prefix = value.substring(0, startIndex);
    const suffix = value.substring(cursorPos);
    const newText = `${prefix}${username} ${suffix}`;
    
    setText(newText);
    setMentionQuery(null);

    const newCursorPos = prefix.length + username.length + 2;
    setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const filteredSuggestions = mentionQuery !== null
    ? suggestions.filter(s => s.username.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (mentionQuery !== null && filteredSuggestions.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActiveSuggestionIndex(prev => (prev + 1) % filteredSuggestions.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActiveSuggestionIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              handleMentionSelect(filteredSuggestions[activeSuggestionIndex].username);
          } else if (e.key === 'Escape') {
              e.preventDefault();
              setMentionQuery(null);
          }
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleShare();
      }
  };

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
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setOriginalCroppedImage(croppedDataUrl);
    setWasEditedByAI(false);
    setImageToCrop(null);
  }

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };

  const removeImage = () => {
      setImageToCrop(null);
      setCroppedImage(null);
      setOriginalCroppedImage(null);
      setWasEditedByAI(false);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const handleAiEdit = async () => {
    if (!croppedImage || !aiPrompt.trim()) return;

    setIsAiEditing(false); // Close dialog
    setIsAiLoading(true); // Show progress bar on the form
    try {
        const result = await applyImageFilter({
            photoDataUri: croppedImage,
            style: aiPrompt,
        });

        if (result.success && result.data?.styledPhotoDataUri) {
            setCroppedImage(result.data.styledPhotoDataUri);
            setWasEditedByAI(true);
            toast({ description: "Resim başarıyla AI ile düzenlendi." });
            setAiPrompt("");
        } else {
            throw new Error(result.error || "AI düzenlemesi başarısız oldu.");
        }
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "AI Düzenleme Hatası",
            description: error.message,
        });
    } finally {
        setIsAiLoading(false);
    }
  };

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
        
        if (featureFlags?.contentModerationEnabled && croppedImage) {
            setIsModerating(true);
            const safetyResult = await checkImageSafety({ photoDataUri: croppedImage });
            setIsModerating(false);

            if (!safetyResult.success || !safetyResult.data?.isSafe) {
                toast({
                    variant: "destructive",
                    title: "Uygunsuz İçerik Tespit Edildi",
                    description: safetyResult.data?.reason || "Bu resim topluluk kurallarını ihlal ettiği için paylaşılamadı.",
                    duration: 7000,
                });
                setIsSubmitting(false);
                return;
            }
        }
        
        if (croppedImage) {
            const imageBlob = await dataUriToBlob(croppedImage);
            const fileExtension = imageBlob.type.split('/')[1] || 'jpg';
            const imageRef = ref(storage, `upload/posts/${user.uid}/${Date.now()}_post.${fileExtension}`);
            
            const snapshot = await uploadBytes(imageRef, imageBlob);
            imageUrl = await getDownloadURL(snapshot.ref);
        }

        await createPost({
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL || null,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            userGender: userData.gender,
            text: text,
            imageUrl: imageUrl || "",
            editedWithAI: wasEditedByAI,
            language: i18n.language,
            commentsDisabled: commentsDisabled,
            likesHidden: likesHidden,
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

  const handleRevertAiEdit = () => {
      if (originalCroppedImage) {
          setCroppedImage(originalCroppedImage);
          setWasEditedByAI(false);
          toast({ description: "AI düzenlemesi geri alındı." });
      }
  };


  const isLoading = isSubmitting || isAiLoading || isModerating;

  return (
    <>
      <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 p-5">
            <Popover open={mentionQuery !== null}>
                <PopoverAnchor asChild>
                    <div className="flex items-start gap-4">
                        <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-11 w-11 flex-shrink-0 border-2 border-white">
                            <AvatarImage src={user?.photoURL || undefined} />
                            <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        </div>
                        <Textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Aklında ne var? Birinden bahsetmek için @kullaniciadi kullan."
                            className="min-h-[60px] flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
                            rows={2}
                            disabled={isLoading}
                        />
                    </div>
                </PopoverAnchor>
                <PopoverContent className="w-64 p-1">
                     {suggestionLoading ? (
                        <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                    ) : filteredSuggestions.length > 0 ? (
                        <ScrollArea className="max-h-48">
                            <div className="p-1">
                            {filteredSuggestions.map((user, index) => (
                                <button
                                    key={user.uid}
                                    onClick={() => handleMentionSelect(user.username)}
                                    onMouseMove={() => setActiveSuggestionIndex(index)}
                                    className={cn(
                                        "w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-accent",
                                        index === activeSuggestionIndex && "bg-accent"
                                    )}
                                >
                                    <Avatar className="h-7 w-7"><AvatarImage src={user.photoURL || undefined} /><AvatarFallback>{user.username.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="font-medium text-sm">{user.username}</span>
                                </button>
                            ))}
                            </div>
                        </ScrollArea>
                    ) : (
                        <p className="text-center text-sm text-muted-foreground p-2">Kullanıcı bulunamadı.</p>
                    )}
                </PopoverContent>
            </Popover>

          {isAiLoading && (
            <div className="px-5 pb-2">
                <div className="flex items-center gap-2 text-sm text-primary p-2 bg-primary/10 rounded-lg animate-in fade-in">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Yapay zeka resmi düzenliyor, lütfen bekleyin...</span>
                </div>
            </div>
          )}

          {croppedImage && (
            <div className="ml-0 sm:ml-16 space-y-2">
                <div className="relative group">
                    <div className="overflow-hidden rounded-xl border">
                        <img src={croppedImage} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAiEditing(true)} disabled={isLoading}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        AI ile Düzenle
                    </Button>
                    {wasEditedByAI && (
                        <Button variant="outline" size="sm" onClick={handleRevertAiEdit} disabled={isLoading}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Geri Al
                        </Button>
                    )}
                    <Button variant="destructive" size="sm" onClick={removeImage} disabled={isLoading}>
                        <X className="mr-2 h-4 w-4" />
                        Kaldır
                    </Button>
                </div>
            </div>
          )}
           <div className="ml-0 sm:ml-16 space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                        <Label htmlFor="disable-comments" className="font-semibold flex items-center gap-2"><MessageCircleOff className="h-4 w-4"/> Yorumları Kapat</Label>
                        <p className="text-xs text-muted-foreground pl-6">Bu gönderiye kimse yorum yapamaz.</p>
                    </div>
                    <Switch id="disable-comments" checked={commentsDisabled} onCheckedChange={setCommentsDisabled} />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                         <Label htmlFor="hide-likes" className="font-semibold flex items-center gap-2"><HeartOff className="h-4 w-4"/> Beğeni Sayısını Gizle</Label>
                        <p className="text-xs text-muted-foreground pl-6">Diğerleri bu gönderiyi kaç kişinin beğendiğini göremez.</p>
                    </div>
                    <Switch id="hide-likes" checked={likesHidden} onCheckedChange={setLikesHidden} />
                </div>
            </div>
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
            {isSubmitting || isModerating ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="ml-2 hidden sm:inline">{isModerating ? 'Kontrol Ediliyor...' : (isSubmitting ? 'Paylaşılıyor...' : 'Paylaş')}</span>
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
      <AlertDialog open={isAiEditing} onOpenChange={setIsAiEditing}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Resmi AI ile Düzenle</AlertDialogTitle>
            <AlertDialogDescription>
                Resme uygulamak istediğiniz stili veya değişikliği yazın. Örneğin: "suluboya tabloya çevir", "8-bit pixel art yap", "arka planı orman yap".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="örn: make it a watercolor painting"
            disabled={isAiLoading}
            />
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isAiLoading}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiEdit} disabled={!aiPrompt || isAiLoading}>
                {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uygula
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
