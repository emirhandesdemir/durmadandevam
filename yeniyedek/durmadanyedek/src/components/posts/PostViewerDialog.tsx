// src/components/posts/PostViewerDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import PostCard from "./PostCard";
import type { Post } from "@/lib/types";

interface PostViewerDialogProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PostViewerDialog({
  post,
  open,
  onOpenChange,
}: PostViewerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-lg w-full bg-card/95 backdrop-blur-lg border-border/50 rounded-2xl shadow-lg overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{post.username} adlı kullanıcının gönderisi</DialogTitle>
        </DialogHeader>
        <PostCard post={post} isStandalone={true} />
      </DialogContent>
    </Dialog>
  );
}
