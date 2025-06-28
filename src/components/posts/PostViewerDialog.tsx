// src/components/posts/PostViewerDialog.tsx
"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import PostCard from "./PostCard";
import type { Post } from "./PostsFeed";

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
      <DialogContent className="p-0 border-0 max-w-lg w-full bg-transparent shadow-none">
        <PostCard post={post} />
      </DialogContent>
    </Dialog>
  );
}
