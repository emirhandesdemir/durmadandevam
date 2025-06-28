// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import FollowListDialog from './FollowListDialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getChatId } from '@/lib/utils';

interface ProfileHeaderProps {
  profileUser: any;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { user: currentUserAuth, userData: currentUserData } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');

  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;

  const handleStatClick = (type: 'followers' | 'following') => {
    setDialogType(type);
    setDialogOpen(true);
  };
  
  const userIdsToShow = dialogType === 'followers' ? profileUser.followers : profileUser.following;

  return (
    <>
      <div className="flex flex-col items-center text-center p-4">
        {/* Avatar */}
        <Avatar className="h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
          <AvatarImage src={profileUser.photoURL || undefined} />
          <AvatarFallback className="text-5xl">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold">{profileUser.username}</h1>
          {profileUser.bio && <p className="text-sm text-muted-foreground max-w-md mt-1">{profileUser.bio}</p>}
        </div>

        {/* Stats */}
        <div className="mt-6 w-full max-w-sm grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg">
                <p className="font-bold text-lg">{profileUser.postCount || 0}</p>
                <p className="text-xs text-muted-foreground">Gönderi</p>
            </div>
            <button onClick={() => handleStatClick('followers')} className="text-center p-2 rounded-lg hover:bg-muted transition-colors">
                <p className="font-bold text-lg">{(profileUser.followers || []).length}</p>
                <p className="text-xs text-muted-foreground">Takipçi</p>
            </button>
            <button onClick={() => handleStatClick('following')} className="text-center p-2 rounded-lg hover:bg-muted transition-colors">
                <p className="font-bold text-lg">{(profileUser.following || []).length}</p>
                <p className="text-xs text-muted-foreground">Takip</p>
            </button>
        </div>
        
        {/* Action Buttons */}
        <div className="mt-4 w-full max-w-sm grid grid-cols-2 gap-2">
           {isOwnProfile ? (
              <Button asChild variant="secondary" className="col-span-2">
                  <Link href="/profile">Profili Düzenle</Link>
              </Button>
            ) : (
                <>
                    <FollowButton currentUser={currentUserData} targetUser={profileUser} />
                    <Button asChild>
                        <Link href={`/dm/${getChatId(currentUserAuth!.uid, profileUser.uid)}`}>
                           <MessageCircle className="mr-2 h-4 w-4"/> Mesaj
                        </Link>
                    </Button>
                </>
            )}
        </div>
      </div>
      <FollowListDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        userIds={userIdsToShow || []}
        type={dialogType}
      />
    </>
  );
}
