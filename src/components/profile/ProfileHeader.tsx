// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings, Gem, MoreHorizontal, ShieldOff, UserCheck, Crown, Bookmark } from 'lucide-react';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import FollowListDialog from './FollowListDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChatId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { blockUser, unblockUser } from '@/lib/actions/userActions';
import ReportDialog from '../common/ReportDialog';
import { Loader2 } from 'lucide-react';

interface UserProfile {
  uid: string;
  username: string;
  postCount: number;
  followers: string[];
  following: string[];
  photoURL?: string | null;
  bio?: string | null;
  privateProfile?: boolean;
  followRequests?: any[];
  blockedUsers?: string[];
  premiumUntil?: any;
}

interface ProfileHeaderProps {
  profileUser: UserProfile;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { user: currentUserAuth, userData: currentUserData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);

  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;
  const amIBlockedByThisUser = profileUser.blockedUsers?.includes(currentUserAuth?.uid || '');
  const haveIBlockedThisUser = currentUserData?.blockedUsers?.includes(profileUser.uid);
  const isPremium = profileUser.premiumUntil && new Date(profileUser.premiumUntil.seconds * 1000) > new Date();


  const handleStatClick = (type: 'followers' | 'following') => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const handleBlockUser = async () => {
    if (!currentUserData) return;
    setIsBlocking(true);
    const result = await blockUser(currentUserData.uid, profileUser.uid);
    setIsBlocking(false);
    if (result.success) {
      toast({ description: `${profileUser.username} engellendi.` });
    } else {
      toast({ variant: 'destructive', description: result.error });
    }
  };

  const handleUnblockUser = async () => {
      if (!currentUserData) return;
      setIsBlocking(true);
      const result = await unblockUser(currentUserData.uid, profileUser.uid);
      setIsBlocking(false);
      if (result.success) {
          toast({ description: `${profileUser.username} kullanıcısının engeli kaldırıldı.` });
      } else {
          toast({ variant: 'destructive', description: result.error });
      }
  };
  
  const userIdsToShow = dialogType === 'followers' ? profileUser.followers : profileUser.following;
  
  if (amIBlockedByThisUser) {
    return (
        <div className="flex flex-col items-center justify-center text-center p-8 h-64">
          <ShieldOff className="h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">Erişim Engellendi</h2>
          <p className="mt-2 text-muted-foreground">Bu kullanıcının profilini görüntüleyemezsiniz.</p>
        </div>
    );
  }

  return (
    <>
      <div className="p-4 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar className={cn("h-20 w-20 border-4", isPremium ? "border-amber-400" : "border-background")}>
            <AvatarImage src={profileUser.photoURL || undefined} />
            <AvatarFallback className="text-3xl bg-muted">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{profileUser.username}</h1>
                {isPremium && <Crown className="h-5 w-5 text-yellow-500" />}
            </div>
            
            <div className="flex items-center gap-4 text-sm">
                <div><span className="font-bold">{profileUser.postCount}</span> gönderi</div>
                <button onClick={() => handleStatClick('followers')} className="hover:underline"><span className="font-bold">{profileUser.followers?.length || 0}</span> takipçi</button>
                <button onClick={() => handleStatClick('following')} className="hover:underline"><span className="font-bold">{profileUser.following?.length || 0}</span> takip</button>
            </div>
          </div>
          {isOwnProfile && (
             <Button asChild variant="outline" size="icon">
                <Link href="/profile"><Settings className="h-5 w-5"/></Link>
            </Button>
          )}
        </div>
        
        {profileUser.bio && <p className="text-sm">{profileUser.bio}</p>}

        {!isOwnProfile && !haveIBlockedThisUser && (
            <div className="flex w-full gap-2">
                <FollowButton currentUserData={currentUserData} targetUser={profileUser} />
                <Button asChild className="flex-1">
                    <Link href={`/dm/${getChatId(currentUserAuth!.uid, profileUser.uid)}`}><MessageCircle className="mr-2 h-4 w-4"/> Mesaj</Link>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsReportOpen(true)}>Şikayet Et</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleBlockUser} className="text-destructive focus:text-destructive">
                       {isBlocking ? <Loader2 className="animate-spin mr-2"/> : <ShieldOff className="mr-2 h-4 w-4"/>}
                        Engelle
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            </div>
        )}
         {haveIBlockedThisUser && (
            <Button onClick={handleUnblockUser} variant="destructive" className="w-full">
                {isBlocking ? <Loader2 className="animate-spin mr-2"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                Engeli Kaldır
            </Button>
        )}
      </div>

      <FollowListDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        userIds={userIdsToShow || []}
        type={dialogType}
      />
      {isReportOpen && (
          <ReportDialog 
            isOpen={isReportOpen}
            onOpenChange={setIsReportOpen}
            target={{ type: 'user', id: profileUser.uid, name: profileUser.username }}
          />
      )}
    </>
  );
}
