// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadBytes } from "firebase/storage";
import { createPost } from "@/lib/actions/postActions";
import { getFollowingForSuggestions } from "@/lib/actions/userActions";
import type { UserProfile } from "@/lib/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Image as ImageIcon, Send, Loader2, X, FileVideo, MessageCircleOff, HeartOff } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { useTranslation } from "react-i18next";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";


export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [commentsDisabled, setCommentsDisabled] = useState(false);
  const [likesHidden, setLikesHidden] = useState(false);

  useEffect(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    let initialText = '';
    if (sharedTitle) initialText += sharedTitle + '\n';
    if (sharedText) initialText += sharedText + '\n';
    if (sharedUrl) initialText += sharedUrl;

    if (initialText) setText(initialText.trim());
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      if (selectedFile.size > 50 * 1024 * 1024) { 
          toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Dosya boyutu 50MB'dan büyük olamaz." });
          return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleFileClick = () => { fileInputRef.current?.click(); };
  const removeFile = () => {
      setFile(null);
      setPreviewUrl(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız.' });
      return;
    }
    if (!text.trim() && !file) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya bir dosya seçin.' });
      return;
    }

    setIsSubmitting(true);
    
    try {
        let imageUrl = "";
        let videoUrl = "";
        
        if (file) {
            const isImage = file.type.startsWith('image/');
            const folder = isImage ? 'posts/images' : 'posts/videos';
            const fileExtension = file.name.split('.').pop();
            const storagePath = `upload/${folder}/${user.uid}/${Date.now()}_post.${fileExtension}`;
            const fileRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);
            if (isImage) imageUrl = downloadUrl;
            else videoUrl = downloadUrl;
        }

        await createPost({
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL || null,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            userGender: userData.gender,
            text: text,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            editedWithAI: false, // AI edit removed for now
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
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
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

            {previewUrl && file && (
                <div className="ml-0 sm:ml-16 space-y-2">
                    <div className="relative group">
                        <div className="overflow-hidden rounded-xl border">
                            {file.type.startsWith('image/') ? (
                                <img src={previewUrl} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                            ) : (
                                <video src={previewUrl} controls className="max-h-80 w-auto object-contain rounded-xl" />
                            )}
                        </div>
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={removeFile} disabled={isSubmitting}>
                            <X className="h-4 w-4" />
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
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            onClick={handleFileClick}
            disabled={isSubmitting || !!file}
            aria-label="Dosya Ekle"
          >
            {file?.type.startsWith('image/') ? <ImageIcon className="h-5 w-5" /> : <FileVideo className="h-5 w-5" />}
          </Button>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isSubmitting || (!text.trim() && !file)}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="ml-2 hidden sm:inline">{isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}</span>
          </Button>
        </div>
      </Card>
  );
}
