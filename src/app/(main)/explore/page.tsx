// src/app/(main)/explore/page.tsx
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getPopularUsers } from '@/lib/actions/analyticsActions';
import type { UserProfile } from '@/lib/types';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import UserPostGrid from '@/components/profile/UserPostsGrid';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

function UserProfileReel({ user }: { user: UserProfile }) {
    const router = useRouter();
    const handleFollowClick = () => {
        // Placeholder for follow logic
        // In a real app, you would call a server action here
        console.log(`Following ${user.username}`);
    };
    return (
        <div className="h-full w-full relative snap-start flex flex-col bg-card text-card-foreground">
            <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                         <Link href={`/profile/${user.uid}`} className="font-bold hover:underline text-white shadow-black/50 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">{user.username}</Link>
                         {user.bio && <p className="text-xs text-white/90 line-clamp-1 [text-shadow:_0_1px_2px_var(--tw-shadow-color)]">{user.bio}</p>}
                    </div>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto">
                 <UserPostGrid profileUser={user} />
            </div>
            <div className="p-4 border-t">
                <Button className="w-full" onClick={() => router.push(`/profile/${user.uid}`)}>Profili Ziyaret Et</Button>
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
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  if (users.length === 0) {
      return (
          <div className="flex h-full flex-col items-center justify-center text-center p-4">
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
            <Button onClick={() => router.back()} variant="ghost" size="icon" className="rounded-full bg-background/50 text-foreground hover:bg-background/80">
                <ArrowLeft className="h-5 w-5" />
            </Button>
        </div>
      {users.map((user) => (
        <UserProfileReel key={user.uid} user={user} />
      ))}
    </div>
  );
}
