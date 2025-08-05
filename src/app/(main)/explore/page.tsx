// src/app/(main)/explore/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPopularUsers } from '@/lib/actions/analyticsActions';
import type { UserProfile, Post } from '@/lib/types';
import { getRecentImagePosts } from '@/lib/actions/postActions';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


function UserProfileReel({ user }: { user: UserProfile }) {
    const router = useRouter();
    const [backgroundPost, setBackgroundPost] = useState<Post | null | 'loading'>('loading');
    
    useEffect(() => {
        getRecentImagePosts(user.uid, 1).then(posts => {
            setBackgroundPost(posts[0] || null);
        });
    }, [user.uid]);

    return (
        <div className="h-full w-full relative snap-start flex flex-col bg-card text-card-foreground">
            {/* Background */}
            <div className="absolute inset-0 z-0">
                {backgroundPost === 'loading' ? (
                    <div className="w-full h-full bg-muted animate-pulse"></div>
                ) : backgroundPost ? (
                    <Image
                        src={backgroundPost.imageUrl!}
                        alt={`${user.username}'s background`}
                        fill
                        sizes="100vh"
                        className="object-cover"
                        priority
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black" />
                )}
                 <div className="absolute inset-0 bg-black/30" />
            </div>

            {/* Content */}
            <div className="relative z-10 flex flex-col h-full p-4 text-white">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-white/80">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                         <Link href={`/profile/${user.uid}`} className="font-bold hover:underline text-white shadow-black/50 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">{user.username}</Link>
                         {user.bio && <p className="text-xs text-white/90 line-clamp-1 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">{user.bio}</p>}
                    </div>
                </div>

                <div className="flex-1" />

                 <Button 
                    className="w-full bg-white/20 backdrop-blur-md text-white border-white/30 hover:bg-white/30"
                    onClick={() => router.push(`/profile/${user.uid}`)}
                 >
                    Profili Ziyaret Et
                </Button>
            </div>
        </div>
    );
}

export default function ExplorePage() {
  const { userData } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (userData) {
      getPopularUsers()
        .then((data) => setUsers(data as UserProfile[]))
        .finally(() => setLoading(false));
    }
  }, [userData]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (users.length === 0) {
      return (
          <div className="flex h-full flex-col items-center justify-center text-center p-4 bg-background">
              <h2 className="text-xl font-bold">Keşfedilecek Kimse Yok</h2>
              <p className="mt-2 text-muted-foreground">Daha sonra tekrar kontrol et.</p>
               <Button onClick={() => router.back()} className="mt-4">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Geri Dön
                </Button>
          </div>
      )
  }

  return (
    <div className="h-full w-full snap-y snap-mandatory overflow-y-scroll hide-scrollbar">
       <div className="fixed top-4 left-4 z-20">
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-black/40 text-white hover:bg-black/60 backdrop-blur-sm">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </div>
      {users.map((user) => (
        <UserProfileReel key={user.uid} user={user} />
      ))}
    </div>
  );
}
