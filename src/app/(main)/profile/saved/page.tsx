// src/app/(main)/profile/saved/page.tsx
'use client';

import SavedPostsGrid from "@/components/profile/SavedPostsGrid";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function SavedPostsPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div>
        <header className="flex items-center p-2 border-b">
            <Button asChild variant="ghost" className="rounded-full">
                <Link href="/profile"><ChevronLeft className="mr-2 h-4 w-4"/> Ayarlar</Link>
            </Button>
            <h1 className="text-lg font-semibold mx-auto">Kaydedilenler</h1>
        </header>
        <div className="p-4">
            <SavedPostsGrid userId={user.uid} />
        </div>
    </div>
  );
}
