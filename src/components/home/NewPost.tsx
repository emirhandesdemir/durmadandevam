// src/components/home/NewPost.tsx
"use client";

import Link from 'next/link';
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Image as ImageIcon, Video, Clapperboard } from "lucide-react";
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';

/**
 * Yeni Gönderi Giriş Noktası
 * 
 * Ana sayfada, kullanıcıyı yeni bir gönderi veya surf videosu oluşturma sayfasına yönlendiren
 * bir giriş noktası olarak hizmet verir.
 */
export default function NewPost() {
  const { user, userData } = useAuth();

  // Kullanıcı giriş yapmamışsa bu bileşeni gösterme.
  if (!user) {
    return null;
  }

  return (
    <Card className="group w-full overflow-hidden rounded-2xl border bg-card/50 p-4 shadow-sm shadow-black/5">
        <div className="flex items-center gap-4">
            <Link href={`/profile/${user.uid}`}>
                 <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                    <Avatar className="relative z-[1] h-11 w-11 flex-shrink-0">
                        <AvatarImage src={userData?.photoURL || undefined} />
                        <AvatarFallback>{userData?.profileEmoji || user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            </Link>
            
            <Link href="/create-post" className="flex-1 text-left text-muted-foreground hover:text-foreground transition-colors">
                Aklında ne var, {user.displayName?.split(' ')[0] || 'dostum'}?
            </Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
            <Button asChild variant="ghost" className="justify-center gap-2">
                <Link href="/create-post">
                    <ImageIcon className="h-5 w-5 text-green-500" />
                    <span>Resim</span>
                </Link>
            </Button>
            <Button asChild variant="ghost" className="justify-center gap-2">
                 <Link href="/create-surf">
                    <Clapperboard className="h-5 w-5 text-red-500" />
                    <span>Surf Video</span>
                </Link>
            </Button>
        </div>
    </Card>
  );
}
