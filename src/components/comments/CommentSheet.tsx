// src/components/comments/CommentSheet.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addComment } from "@/lib/actions/commentActions";
import { getFollowingForSuggestions } from "@/lib/actions/userActions";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetDescription,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, X } from "lucide-react";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import type { Post } from "@/lib/types";
import CommentItem from "./CommentItem";
import type { Comment, UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CommentSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: Post;
}

/**
 * Yorumları göstermek, eklemek ve yönetmek için kullanılan alttan açılır panel.
 */
export default function CommentSheet({ open, onOpenChange, post }: CommentSheetProps) {
    const { user, userData } = useAuth();
    const { toast } = useToast();

    // State'ler
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCommentText, setNewCommentText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Reply State
    const [replyTo, setReplyTo] = useState<{ commentId: string; username: string } | null>(null);

    // Mention States
    const [mentionQuery, setMentionQuery] = useState<string | null>(null);
    const [suggestions, setSuggestions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
    const [suggestionLoading, setSuggestionLoading] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
        setNewCommentText(value);

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
        const newText = `${prefix}@${username} ${suffix}`;
        
        setNewCommentText(newText);
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
      }
    };


    // Yorumları Firestore'dan gerçek zamanlı olarak çek
    useEffect(() => {
        if (!open) return; // Panel kapalıysa dinleyiciyi başlatma

        const commentsRef = collection(db, "posts", post.id, "comments");
        const q = query(commentsRef, orderBy("createdAt", "asc"));

        setLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const commentsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Comment));
            setComments(commentsData);
            setLoading(false);
        }, (error) => {
            console.error("Yorumları çekerken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe(); // Panel kapandığında dinleyiciyi temizle
    }, [post.id, open]);

    // Yeni yorum gönderme fonksiyonu
    const handleAddComment = async () => {
        if (!user || !newCommentText.trim() || !userData) return;
        setIsSubmitting(true);
        try {
            await addComment({
                postId: post.id,
                text: newCommentText,
                user: {
                    uid: user.uid,
                    displayName: userData.username,
                    photoURL: userData.photoURL || null,
                    userAvatarFrame: userData.selectedAvatarFrame || '',
                    role: userData.role,
                },
                replyTo: replyTo,
            });
            setNewCommentText("");
            setReplyTo(null);
            toast({ description: "Yorumunuz eklendi." });
        } catch (error) {
            console.error("Yorum eklenirken hata:", error);
            toast({ variant: "destructive", description: "Yorum eklenirken bir hata oluştu." });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    // Cevaplama modunu başlatan fonksiyon
    const handleReply = (commentId: string, username: string) => {
        setReplyTo({ commentId, username });
        textareaRef.current?.focus();
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="bottom" className="h-[90dvh] flex flex-col">
                <SheetHeader className="text-center">
                    <SheetTitle>{post.username} adlı kişinin gönderisi</SheetTitle>
                    <SheetDescription>
                        {post.commentCount || 0} yorum
                    </SheetDescription>
                </SheetHeader>

                <ScrollArea className="flex-1 -mx-6 px-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
                    ) : comments.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground"><p>Henüz hiç yorum yok. İlk yorumu sen yap!</p></div>
                    ) : (
                        <div className="space-y-4 py-4">{comments.map(comment => (<CommentItem key={comment.id} comment={comment} postId={post.id} onReply={handleReply} />))}</div>
                    )}
                </ScrollArea>
                
                <SheetFooter className="mt-auto pt-2 border-t bg-background -mx-6 px-6 pb-2 space-y-2">
                    {replyTo && (
                        <div className="flex items-center justify-between bg-muted rounded-md p-2 text-xs">
                            <p className="text-muted-foreground">Yanıt olarak: <span className="font-bold text-primary">@{replyTo.username}</span></p>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setReplyTo(null)}><X className="h-4 w-4" /></Button>
                        </div>
                    )}
                    <Popover open={mentionQuery !== null}>
                        <PopoverAnchor asChild>
                            <div className="flex items-start gap-2">
                                <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                                    <Avatar className="relative z-[1] h-9 w-9">
                                        <AvatarImage src={user?.photoURL || undefined} />
                                        <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="flex-1 relative">
                                    <Textarea
                                        ref={textareaRef}
                                        value={newCommentText}
                                        onChange={handleTextChange}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Yorumunu ekle..."
                                        className="pr-12 min-h-[40px] max-h-32"
                                        disabled={isSubmitting}
                                    />
                                    <Button size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full" onClick={handleAddComment} disabled={isSubmitting || !newCommentText.trim()}>
                                        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                    </Button>
                                </div>
                            </div>
                        </PopoverAnchor>
                        <PopoverContent className="w-64 p-1">
                            {suggestionLoading ? (
                                <div className="flex items-center justify-center p-2"><Loader2 className="h-4 w-4 animate-spin" /></div>
                            ) : filteredSuggestions.length > 0 ? (
                                <ScrollArea className="max-h-48">
                                    <div className="p-1">
                                    {filteredSuggestions.map((user, index) => (
                                        <button key={user.uid} onClick={() => handleMentionSelect(user.username)} onMouseMove={() => setActiveSuggestionIndex(index)} className={cn("w-full text-left flex items-center gap-2 p-2 rounded-md hover:bg-accent", index === activeSuggestionIndex && "bg-accent")}>
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
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
