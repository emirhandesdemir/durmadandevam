// src/components/profile/UserListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import FollowButton from './FollowButton';
import { cn } from '@/lib/utils';

interface UserListItemProps {
  user: UserProfile;
  currentUserData: UserProfile | null;
}

export default function UserListItem({ user, currentUserData }: UserListItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
      <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group">
         <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
            <Avatar className="relative z-[1] h-10 w-10">
                <AvatarImage src={user.photoURL || undefined} />
                <AvatarFallback>{user.profileEmoji || user.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>
        <span className="font-semibold group-hover:underline">{user.username}</span>
      </Link>
      <FollowButton currentUserData={currentUserData} targetUser={user} />
    </div>
  );
}
