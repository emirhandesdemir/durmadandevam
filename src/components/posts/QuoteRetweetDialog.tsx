// src/components/posts/QuoteRetweetDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { retweetPost } from "@/lib/actions/postActions";
import type { Post } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import Image from "next/image";
import { Timestamp } from "firebase/firestore";


const safeParseTimestamp = (timestamp: any): Date => {
    if (!timestamp) return new Date(0); 
    if (timestamp instanceof Date) return timestamp;
    if (timestamp instanceof Timestamp) return timestamp.toDate();
    if (typeof timestamp === 'object' && 'seconds' in timestamp && 'nanoseconds' in timestamp) {
        return new Timestamp(timestamp.seconds, timestamp.nanoseconds).toDate();
    }
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    return new Date(0);
};

interface QuoteRetweetDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export default function QuoteRetweetDialog({ isOpen, onOpenChange, post }: QuoteRetweetDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [quoteText, setQuoteText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!post) return null;

  const handleRetweet = async () => {
    if (!user || !userData) {
      toast({ variant: "destructive", description: "Bu işlemi yapmak için giriş yapmalısınız." });
      return;
    }
    setIsSubmitting(true);
    try {
      await retweetPost(
        post.id,
        {
          uid: user.uid,
          username: userData.username,
          photoURL: userData.photoURL || null,
          profileEmoji: userData.profileEmoji,
          userAvatarFrame: userData.selectedAvatarFrame,
          userRole: userData.role,
          userGender: userData.gender,
        },
        quoteText
      );
      toast({ description: "Retweetlendi!" });
      setQuoteText("");
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: "destructive", description: error.message || "Retweet yapılamadı." });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const originalCreatedAtDate = safeParseTimestamp(post.createdAt);
  const timeAgo = originalCreatedAtDate.getTime() !== 0 ? formatDistanceToNow(originalCreatedAtDate, { addSuffix: true, locale: tr }) : "az önce";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Alıntıla</DialogTitle>
          <DialogDescription>
            Bu gönderiye bir yorum ekleyerek paylaş.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
            <div className="flex items-start gap-3">
                 <Avatar className="h-9 w-9">
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <Textarea
                    placeholder="Yorumunu ekle..."
                    value={quoteText}
                    onChange={(e) => setQuoteText(e.target.value)}
                    className="min-h-[80px]"
                />
            </div>

            <div className="border rounded-lg p-3 space-y-2 ml-12">
                <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                        <AvatarImage src={post.photoURL || undefined} />
                        <AvatarFallback>{post.username?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-sm">{post.username}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo}</span>
                </div>
                {post.text && <p className="text-sm text-muted-foreground line-clamp-3">{post.text}</p>}
                {post.imageUrl && (
                    <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                        <Image src={post.imageUrl} alt="Alıntılanan resim" fill sizes="96px" className="object-cover" />
                    </div>
                )}
            </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>İptal</Button>
          <Button onClick={handleRetweet} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Retweetle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
