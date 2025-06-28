// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import FollowListDialog from './FollowListDialog';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface ProfileHeaderProps {
  profileUser: any;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { userData: currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');

  const isOwnProfile = currentUser?.uid === profileUser.uid;

  const handleStatClick = (type: 'followers' | 'following') => {
    setDialogType(type);
    setDialogOpen(true);
  };
  
  const userIdsToShow = dialogType === 'followers' ? profileUser.followers : profileUser.following;

  return (
    <>
      <div className="flex flex-col px-4 pt-4">
        {/* Top Section: Avatar and Stats */}
        <div className="flex items-center justify-between gap-4">
          <Avatar className="h-20 w-20 md:h-24 md:w-24">
            <AvatarImage src={profileUser.photoURL || undefined} />
            <AvatarFallback className="text-4xl">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex items-center gap-6 text-center">
            <div>
              <p className="font-bold text-lg">{profileUser.postCount || 0}</p>
              <p className="text-sm text-muted-foreground">gönderi</p>
            </div>
            <button onClick={() => handleStatClick('followers')} className="text-center">
              <p className="font-bold text-lg">{(profileUser.followers || []).length}</p>
              <p className="text-sm text-muted-foreground">takipçi</p>
            </button>
            <button onClick={() => handleStatClick('following')} className="text-center">
              <p className="font-bold text-lg">{(profileUser.following || []).length}</p>
              <p className="text-sm text-muted-foreground">takip</p>
            </button>
          </div>
        </div>

        {/* User Info Section */}
        <div className="mt-4">
          <p className="font-semibold text-sm">{profileUser.username}</p>
          {profileUser.bio && <p className="text-sm whitespace-pre-wrap">{profileUser.bio}</p>}
        </div>

        {/* Action Buttons Section */}
        <div className="mt-4 grid grid-cols-3 gap-2">
           {isOwnProfile ? (
              <>
                <Button asChild variant="secondary" className="flex-1 col-span-2">
                    <Link href="/profile">Profili Düzenle</Link>
                </Button>
                <Button variant="secondary">Profili Paylaş</Button>
              </>
            ) : (
                <>
                    <div className="col-span-2">
                        <FollowButton currentUser={currentUser} targetUser={profileUser} />
                    </div>
                    <Button variant="secondary">
                        <UserPlus />
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
