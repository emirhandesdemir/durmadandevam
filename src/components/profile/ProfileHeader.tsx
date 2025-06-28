// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import FollowListDialog from './FollowListDialog';
import { getChatId } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import Link from 'next/link';


interface ProfileHeaderProps {
  profileUser: any;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { user: authUser, userData: currentUser } = useAuth();
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');

  const isOwnProfile = currentUser?.uid === profileUser.uid;
  const isFollower = (profileUser.followers || []).includes(currentUser?.uid || '');
  const canViewStats = !profileUser.privateProfile || isFollower || isOwnProfile;

  const handleStatClick = (type: 'followers' | 'following') => {
    if (!canViewStats) return;
    setDialogType(type);
    setDialogOpen(true);
  };
  
  const handleMessageClick = () => {
    if (!authUser) return;
    const chatId = getChatId(authUser.uid, profileUser.uid);
    router.push(`/dm/${chatId}`);
  };

  const userIdsToShow = dialogType === 'followers' ? profileUser.followers : profileUser.following;

  return (
    <>
      <div className="flex flex-col items-center gap-6 p-4">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className={cn("avatar-frame-wrapper p-1", profileUser.selectedAvatarFrame)}>
            <Avatar className="h-32 w-32 border-4 border-background shadow-lg">
              <AvatarImage src={profileUser.photoURL || undefined} />
              <AvatarFallback className="text-5xl">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </div>
          <div className="flex flex-col items-center sm:items-start gap-4">
            <h1 className="text-3xl font-bold">{profileUser.username}</h1>
            <div className="flex gap-2">
              {isOwnProfile ? (
                 <Button asChild variant="outline" size="sm">
                      <Link href="/profile">
                          <Settings className="mr-2 h-4 w-4" /> Profili Düzenle
                      </Link>
                  </Button>
              ) : (
                <>
                  <FollowButton currentUser={currentUser} targetUser={profileUser} />
                  <Button variant="secondary" onClick={handleMessageClick}>
                      <MessageSquare className="h-4 w-4" />
                      <span className="ml-2 hidden sm:inline">Mesaj</span>
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
            <button
              onClick={() => handleStatClick('followers')}
              disabled={!canViewStats}
              className={cn("p-4 rounded-xl border bg-card text-center hover:bg-muted/50 transition-colors", !canViewStats && "cursor-not-allowed opacity-60")}
            >
              <p className="text-2xl font-bold">{(profileUser.followers || []).length}</p>
              <p className="text-sm text-muted-foreground">takipçi</p>
            </button>
            <button
              onClick={() => handleStatClick('following')}
              disabled={!canViewStats}
              className={cn("p-4 rounded-xl border bg-card text-center hover:bg-muted/50 transition-colors", !canViewStats && "cursor-not-allowed opacity-60")}
            >
              <p className="text-2xl font-bold">{(profileUser.following || []).length}</p>
              <p className="text-sm text-muted-foreground">takip</p>
            </button>
        </div>

        {!canViewStats && <p className="text-sm text-muted-foreground mt-2">Bu hesap gizli olduğu için istatistikleri görüntülenemiyor.</p>}

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
