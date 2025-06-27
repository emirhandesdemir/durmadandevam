// src/components/profile/UserListItem.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import FollowButton from './FollowButton';

interface UserListItemProps {
  user: UserProfile;
  currentUserData: any | null;
}

export default function UserListItem({ user, currentUserData }: UserListItemProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
      <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group">
        <Avatar className="h-10 w-10">
          <AvatarImage src={user.photoURL || undefined} />
          <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        <span className="font-semibold group-hover:underline">{user.username}</span>
      </Link>
      <FollowButton currentUser={currentUserData} targetUser={user} />
    </div>
  );
}
