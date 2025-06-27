// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import FollowListDialog from './FollowListDialog';

interface ProfileHeaderProps {
  profileUser: any;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { userData: currentUser } = useAuth();
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
  
  const userIdsToShow = dialogType === 'followers' ? profileUser.followers : profileUser.following;

  return (
    <>
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start p-4 rounded-xl">
        <div className={cn("avatar-frame-wrapper p-1", profileUser.selectedAvatarFrame)}>
          <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-background">
            <AvatarImage src={profileUser.photoURL || undefined} />
            <AvatarFallback className="text-4xl">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        <div className="flex flex-col items-center sm:items-start flex-1 gap-4">
          <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">{profileUser.username}</h1>
              {!isOwnProfile && (
                  <div className="flex gap-2">
                      <FollowButton currentUser={currentUser} targetUser={profileUser} />
                      {(!profileUser.privateProfile || isFollower) && (
                          <Button variant="secondary">
                              <MessageSquare className="h-4 w-4" />
                              <span className="ml-2 hidden sm:inline">Mesaj</span>
                          </Button>
                      )}
                  </div>
              )}
          </div>
          
          <div className="flex gap-6 text-center">
            <button
              onClick={() => handleStatClick('followers')}
              disabled={!canViewStats}
              className={cn("cursor-pointer", !canViewStats && "cursor-not-allowed")}
            >
              <p className="font-bold">{(profileUser.followers || []).length}</p>
              <p className="text-sm text-muted-foreground">takipçi</p>
            </button>
            <button
              onClick={() => handleStatClick('following')}
              disabled={!canViewStats}
              className={cn("cursor-pointer", !canViewStats && "cursor-not-allowed")}
            >
              <p className="font-bold">{(profileUser.following || []).length}</p>
              <p className="text-sm text-muted-foreground">takip</p>
            </button>
          </div>
          {!canViewStats && <p className="text-sm text-muted-foreground">Bu hesap gizli</p>}
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
