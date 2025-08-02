// src/components/nearby/NearbyUserCard.tsx
'use client';

import { useEffect, useState } from 'react';
import type { Post } from '@/lib/types';
import { getRecentImagePosts } from '@/lib/actions/postActions';
import type { NearbyUser } from '@/app/(main)/nearby/page';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import { Skeleton } from '../ui/skeleton';
import { MessageCircle, User, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { getChatId } from '@/lib/utils';


interface NearbyUserCardProps {
  user: NearbyUser;
}

function PhotoGridSkeleton() {
    return (
        <div className="grid grid-cols-3 gap-1 mt-2">
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="aspect-square w-full" />
            <Skeleton className="aspect-square w-full" />
        </div>
    )
}

export default function NearbyUserCard({ user }: NearbyUserCardProps) {
  const { user: currentUser } = useAuth();
  const [recentPhotos, setRecentPhotos] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRecentImagePosts(user.uid, 3)
      .then(posts => setRecentPhotos(posts as Post[]))
      .finally(() => setLoading(false));
  }, [user.uid]);

  const chatId = currentUser ? getChatId(currentUser.uid, user.uid) : '';

  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4">
        <div className="flex items-center gap-4">
          <Link href={`/profile/${user.uid}`}>
            <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
                <Avatar className="h-14 w-14 border-2 border-background relative z-[1]">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                </Avatar>
            </div>
          </Link>
          <div className="flex-1">
            <Link href={`/profile/${user.uid}`}>
              <h3 className="font-bold text-lg hover:underline">{user.username}</h3>
            </Link>
            <p className="text-sm text-muted-foreground">
              {user.age && `${user.age} yaşında, `}{user.city}
            </p>
          </div>
        </div>
        {user.bio && <p className="text-sm text-muted-foreground pt-2">{user.bio}</p>}
      </CardHeader>
      
      <CardContent className="p-0">
        {loading ? (
            <PhotoGridSkeleton />
        ) : recentPhotos.length > 0 ? (
            <div className="grid grid-cols-3 gap-0">
                {recentPhotos.map((photo) => (
                    <div key={photo.id} className="relative aspect-square bg-muted">
                        <Image
                            src={photo.imageUrl!}
                            alt={`${user.username}'in gönderisi`}
                            fill
                            sizes="(max-width: 768px) 33vw, 25vw"
                            className="object-cover"
                        />
                    </div>
                ))}
                 {recentPhotos.length < 3 && Array.from({ length: 3 - recentPhotos.length }).map((_, i) => (
                    <div key={`placeholder-${i}`} className="relative aspect-square bg-muted flex items-center justify-center">
                        <ImageIcon className="h-8 w-8 text-muted-foreground/50"/>
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-muted-foreground bg-muted/50">
                <p className="text-sm">Henüz hiç fotoğraf paylaşmamış.</p>
            </div>
        )}
      </CardContent>

      <CardFooter className="p-2 bg-muted/30">
        <div className="flex w-full gap-2">
            <Button asChild className="flex-1" variant="secondary">
                 <Link href={`/profile/${user.uid}`}><User className="mr-2 h-4 w-4"/> Profili Gör</Link>
            </Button>
            <Button asChild className="flex-1">
                 <Link href={`/dm/${chatId}`}><MessageCircle className="mr-2 h-4 w-4"/> Mesaj Gönder</Link>
            </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
