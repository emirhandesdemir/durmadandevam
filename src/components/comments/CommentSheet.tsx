// src/components/comments/CommentSheet.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { addComment } from "@/lib/actions/commentActions";

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
import { Loader2, Send } from "lucide-react";
import { Post } from "../posts/PostsFeed";
import CommentItem, { type Comment } from "./CommentItem";

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
    const [replyingTo, setReplyingTo] = useState<{ commentId: string; username: string } | null>(null);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
                    displayName: user.displayName,
                    photoURL: user.photoURL,
                    userAvatarFrame: userData.selectedAvatarFrame || '',
                },
                replyTo: replyingTo || undefined
            });
            setNewCommentText("");
            setReplyingTo(null); // Cevap modunu temizle
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
        setReplyingTo({ commentId, username });
        setNewCommentText(`@${username} `);
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

                {/* Yorum listesi */}
                <ScrollArea className="flex-1 -mx-6 px-6">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : comments.length === 0 ? (
                        <div className="flex justify-center items-center h-full text-muted-foreground">
                            <p>Henüz hiç yorum yok. İlk yorumu sen yap!</p>
                        </div>
                    ) : (
                        <div className="space-y-4 py-4">
                            {comments.map(comment => (
                                <CommentItem 
                                    key={comment.id} 
                                    comment={comment} 
                                    postId={post.id}
                                    onReply={handleReply}
                                />
                            ))}
                        </div>
                    )}
                </ScrollArea>
                
                {/* Yeni yorum giriş alanı */}
                <SheetFooter className="mt-auto pt-4 border-t bg-background -mx-6 px-6 pb-2">
                    {replyingTo && (
                        <div className="text-sm text-muted-foreground p-2 bg-muted rounded-md flex justify-between items-center">
                            <span>@{replyingTo.username} adlı kullanıcıya cevap veriliyor...</span>
                            <Button variant="ghost" size="sm" onClick={() => { setReplyingTo(null); setNewCommentText(""); }}>İptal</Button>
                        </div>
                    )}
                    <div className="flex items-start gap-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user?.photoURL || undefined} />
                            <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 relative">
                            <Textarea
                                ref={textareaRef}
                                value={newCommentText}
                                onChange={(e) => setNewCommentText(e.target.value)}
                                placeholder="Yorumunu ekle..."
                                className="pr-12 min-h-[40px] max-h-32"
                                disabled={isSubmitting}
                            />
                            <Button
                                size="icon"
                                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                                onClick={handleAddComment}
                                disabled={isSubmitting || !newCommentText.trim()}
                            >
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
