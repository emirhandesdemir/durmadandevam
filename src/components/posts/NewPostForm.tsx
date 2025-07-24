// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { createPost } from "@/lib/actions/postActions";
import { getFollowingForSuggestions } from "@/lib/actions/suggestionActions";
import type { UserProfile } from "@/lib/types";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Send, Loader2, MessageCircleOff, HeartOff, ChevronLeft } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { useTranslation } from "react-i18next";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import Link from "next/link";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  const [text, setText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
  
  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız veya verilerinizin yüklenmesini beklemelisiniz.' });
      return;
    }
    if (!text.trim()) {
      toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın.' });
      return;
    }

    setIsSubmitting(true);
    
    toast({ title: "Paylaşılıyor...", description: "Gönderiniz hazırlanıyor ve yakında akışta görünecek." });
    router.push('/home');

    try {
      await createPost({
          uid: user.uid,
          username: userData.username,
          userPhotoURL: userData.photoURL || null,
          userAvatarFrame: userData.selectedAvatarFrame || '',
          userRole: userData.role || 'user',
          userGender: userData.gender,
          text: text,
          imageUrl: null, // Image upload removed
          videoUrl: null,
          language: i18n.language,
          commentsDisabled: commentsDisabled,
          likesHidden: likesHidden,
      });
    } catch (error: any) {
        console.error("Gönderi paylaşılırken hata:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Bir Hata Oluştu', 
            description: error.message || 'Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.', 
            duration: 9000 
        });
    }
  };

  return (
    <>
      <main className="flex flex-col h-full bg-background">
        <header className="flex items-center justify-between p-2 border-b">
          <Button asChild variant="ghost" className="rounded-full">
            <Link href="/create"><ChevronLeft className="mr-2 h-4 w-4" /> Geri</Link>
          </Button>
          <Button onClick={handleShare} disabled={isSubmitting || !text.trim()}>
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
          </div>
        </ScrollArea>
        
        <div className="p-2 border-t flex items-center justify-end">
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
    </>
  );
}
