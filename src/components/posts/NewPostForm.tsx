// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/actions/postActions";
import { getFollowingForSuggestions } from "@/lib/actions/suggestionActions";
import type { UserProfile, Post } from "@/lib/types";
import { checkImageSafety } from "@/lib/actions/moderationActions";
import { ref as storageRef, uploadString, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { v4 as uuidv4 } from 'uuid';


import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Send, Loader2, MessageCircleOff, HeartOff, ChevronLeft, Image as ImageIcon, X, Video } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { useTranslation } from "react-i18next";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import ImageCropperDialog from "../common/ImageCropperDialog";
import TextPostBackgroundSelector from "./TextPostBackgroundSelector";

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData, featureFlags } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [likesHidden, setLikesHidden] = useState(false);
  const [backgroundStyle, setBackgroundStyle] = useState("");

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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) { // 10MB limit
            toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Resim boyutu 10MB'dan büyük olamaz." });
            return;
        }
        setVideoFile(null);
        setVideoPreviewUrl(null);
        const reader = new FileReader();
        reader.onload = () => setImageToCrop(reader.result as string);
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            toast({ variant: "destructive", title: "Video Çok Büyük", description: "Video boyutu 50MB'dan büyük olamaz." });
            return;
        }
        removeImage();
        setVideoFile(file);
        setVideoPreviewUrl(URL.createObjectURL(file));
    } else {
        toast({ variant: "destructive", description: "Lütfen bir resim veya video dosyası seçin." });
    }
};

  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setImageToCrop(null);
  }

  const removeImage = () => {
      setImageToCrop(null);
      setCroppedImage(null);
      if(fileInputRef.current) {
          fileInputRef.current.value = "";
      }
  }

  const removeVideo = () => {
      setVideoFile(null);
      setVideoPreviewUrl(null);
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
  }

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
  
  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız veya verilerinizin yüklenmesini beklemelisiniz.' });
      return;
    }
    if (!text.trim() && !croppedImage && !videoFile) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya medya seçin.' });
      return;
    }
  
    setIsSubmitting(true);
  
    try {
      let finalImageUrl: string | null = null;
      let finalVideoUrl: string | null = null;
  
      if (croppedImage) {
        if (featureFlags?.contentModerationEnabled) {
          const safetyResult = await checkImageSafety({ photoDataUri: croppedImage });
          if (!safetyResult.success || !safetyResult.data?.isSafe) {
            throw new Error(safetyResult.error || safetyResult.data?.reason || "Resim güvenlik kontrolünden geçemedi.");
          }
        }
        const imageRef = storageRef(storage, `upload/posts/${user.uid}/${uuidv4()}.jpg`);
        await uploadString(imageRef, croppedImage, 'data_url');
        finalImageUrl = await getDownloadURL(imageRef);
      } else if (videoFile) {
        const videoRef = storageRef(storage, `upload/posts/${user.uid}/videos/${uuidv4()}_${videoFile.name}`);
        await uploadBytes(videoRef, videoFile);
        finalVideoUrl = await getDownloadURL(videoRef);
      }
      
      toast({ title: "Paylaşılıyor...", description: "Gönderiniz hazırlanıyor ve yakında akışta görünecek." });
      router.push('/home');
  
      await createPost({
        uid: user.uid,
        username: userData.username,
        userPhotoURL: userData.photoURL || null,
        userAvatarFrame: userData.selectedAvatarFrame || '',
        userRole: userData.role || 'user',
        userGender: userData.gender,
        text: text,
        imageUrl: finalImageUrl,
        videoUrl: finalVideoUrl,
        language: i18n.language,
        commentsDisabled: commentsDisabled,
        likesHidden: likesHidden,
        backgroundStyle: (!finalImageUrl && !finalVideoUrl) ? backgroundStyle : '',
      });
  
    } catch (error: any) {
      console.error("Gönderi paylaşılırken hata:", error);
      toast({ 
        variant: 'destructive', 
        title: 'Bir Hata Oluştu', 
        description: error.message || 'Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.', 
        duration: 9000 
      });
      // Important: Push back to the create page on error so the user doesn't lose their post
      router.push('/create');
    } finally {
        if (router.pathname !== '/home') {
            setIsSubmitting(false);
        }
    }
  };

  return (
    <>
      <main className="flex flex-col h-full bg-background">
        <header className="flex items-center justify-between p-2 border-b">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/home"><ChevronLeft className="mr-2 h-4 w-4" /> Geri</Link>
          </Button>
          <Button onClick={handleShare} disabled={isSubmitting || (!text.trim() && !croppedImage && !videoFile)}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Paylaş
          </Button>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            <Popover open={mentionQuery !== null}>
                <PopoverAnchor asChild>
                    <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10 border">
                            <AvatarImage src={userData?.photoURL || undefined} />
                            <AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <Textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Aklında ne var? Birinden bahsetmek için @kullaniciadi kullan."
                            className="flex-1 resize-none border-0 p-0 text-base placeholder:text-muted-foreground focus-visible:ring-0 shadow-none min-h-[100px]"
                            disabled={isSubmitting}
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
                                    className={cn("w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-accent", index === activeSuggestionIndex && "bg-accent")}
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
             {croppedImage && (
                <div className="ml-12 relative w-fit">
                    <img src={croppedImage} alt="Önizleme" className="max-h-72 rounded-lg border" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={removeImage} disabled={isSubmitting}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
             {videoPreviewUrl && (
                <div className="ml-12 relative w-fit">
                    <video src={videoPreviewUrl} controls className="max-h-72 rounded-lg border bg-black" />
                    <Button variant="destructive" size="icon" className="absolute -top-2 -right-2 h-7 w-7 rounded-full" onClick={removeVideo} disabled={isSubmitting}>
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            )}
             {!croppedImage && !videoFile && (
                <div className="ml-12">
                     <TextPostBackgroundSelector selectedStyle={backgroundStyle} onSelectStyle={setBackgroundStyle} />
                </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t flex items-center justify-between">
            <div className="flex items-center">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                >
                    <ImageIcon className="h-5 w-5" />
                    <span className="sr-only">Galeri</span>
                </Button>
            </div>
            <Sheet>
                <SheetTrigger asChild>
                    <Button variant="ghost" className="text-muted-foreground">Ayarlar</Button>
                </SheetTrigger>
                <SheetContent side="bottom">
                    <div className="p-4 space-y-4">
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="disable-comments" className="font-semibold flex items-center gap-2"><MessageCircleOff className="h-4 w-4"/> Yorumları Kapat</Label>
                                <p className="text-xs text-muted-foreground pl-6">Bu gönderiye kimse yorum yapamaz.</p>
                            </div>
                            <Switch id="disable-comments" checked={commentsDisabled} onCheckedChange={setCommentsDisabled} />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                 <Label htmlFor="hide-likes" className="font-semibold flex items-center gap-2"><HeartOff className="h-4 w-4"/> Beğeni Sayısını Gizle</Label>
                                <p className="text-xs text-muted-foreground pl-6">Diğerleri bu gönderiyi kaç kişinin beğendiğini göremez.</p>
                            </div>
                            <Switch id="hide-likes" checked={likesHidden} onCheckedChange={setLikesHidden} />
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </div>
      </main>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        setIsOpen={setImageToCrop}
        imageSrc={imageToCrop}
        aspectRatio={16/9}
        onCropComplete={handleCropComplete}
      />
    </>
  );
}
