// src/components/profile/ProfileHeader.tsx
"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserProfile } from "@/lib/types";
import { cn } from "@/lib/utils";
import FollowButton from "./FollowButton";

interface ProfileHeaderProps {
  profileUser: UserProfile;
  currentUser: UserProfile | null;
}

/**
 * Dinamik profil sayfasının başlık bölümü.
 * Avatar, kullanıcı adı, takipçi/takip edilen sayıları ve takip butonunu içerir.
 */
export default function ProfileHeader({ profileUser, currentUser }: ProfileHeaderProps) {
  const isOwnProfile = currentUser?.uid === profileUser.uid;
  const isFollower = profileUser.followers.includes(currentUser?.uid || '');
  const canViewStats = !profileUser.privateProfile || isFollower || isOwnProfile;

  return (
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
              <FollowButton 
                currentUser={currentUser} 
                targetUser={profileUser}
              />
            )}
        </div>
        
        {canViewStats ? (
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-bold">{profileUser.followers.length}</p>
              <p className="text-sm text-muted-foreground">takipçi</p>
            </div>
            <div>
              <p className="font-bold">{profileUser.following.length}</p>
              <p className="text-sm text-muted-foreground">takip</p>
            </div>
          </div>
        ) : (
             <div className="flex gap-6 text-center text-muted-foreground text-sm">
                <p>Bu hesap gizli</p>
            </div>
        )}
      </div>
    </div>
  );
}
