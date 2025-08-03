// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings, Gem, MoreHorizontal, ShieldOff, UserCheck, Crown, Bookmark, BadgeCheck, Award, At, Star } from 'lucide-react';
import FollowButton from './FollowButton';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import FollowListDialog from './FollowListDialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getChatId } from '@/lib/utils';
import { cn } from '@/lib/utils';
import SendDiamondDialog from '../diamond/SendDiamondDialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { blockUser, unblockUser } from '@/lib/actions/userActions';
import ReportDialog from '../common/ReportDialog';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import type { UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import BadgesDialog from './BadgesDialog';
import AvatarWithFrame from '../common/AvatarWithFrame';
import { Progress } from '../ui/progress';
import { giftLevelThresholds } from '@/lib/gifts';


interface ProfileHeaderProps {
  profileUser: UserProfile;
}

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { user: currentUserAuth, userData: currentUserData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');
  const [sendDiamondOpen, setSendDiamondOpen] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isBadgesOpen, setIsBadgesOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;
  const amIBlockedByThisUser = profileUser.blockedUsers?.includes(currentUserAuth?.uid || '');
  const haveIBlockedThisUser = currentUserData?.blockedUsers?.includes(profileUser.uid);
  const isPremium = isClient && profileUser.premiumUntil && new Date((profileUser.premiumUntil as any)?.seconds * 1000 || profileUser.premiumUntil) > new Date();
  const isVerified = isClient && (profileUser.emailVerified);

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
  
  const currentLevelInfo = giftLevelThresholds.find(t => t.level === (profileUser.giftLevel || 0)) || { level: 0, diamonds: 0 };
  const nextLevelInfo = giftLevelThresholds.find(t => t.level === (profileUser.giftLevel || 0) + 1);
  let progress = 0;
  if (nextLevelInfo) {
      const diamondsForCurrentLevel = currentLevelInfo.diamonds;
      const diamondsForNextLevel = nextLevelInfo.diamonds - diamondsForCurrentLevel;
      const progressInLevel = (profileUser.totalDiamondsSent || 0) - diamondsForCurrentLevel;
      progress = (progressInLevel / diamondsForNextLevel) * 100;
  } else {
      progress = 100; // Max level
  }
  
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
      <div className={cn("p-4 space-y-4", isPremium && "judge-profile-bg")}>
        <div className="flex items-start gap-4">
            <AvatarWithFrame 
                photoURL={profileUser.photoURL}
                selectedAvatarFrame={profileUser.selectedAvatarFrame}
                className="h-20 w-20 border-4 border-background shadow-lg"
                fallback={profileUser.username?.charAt(0).toUpperCase()}
                fallbackClassName="text-3xl"
            />
            <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{profileUser.username}</h1>
                    {isPremium && (
                        <TooltipProvider><Tooltip><TooltipTrigger><Crown className="h-5 w-5 text-yellow-500" /></TooltipTrigger><TooltipContent><p>Premium Üye</p></TooltipContent></Tooltip></TooltipProvider>
                    )}
                     {isVerified && (
                        <TooltipProvider><Tooltip><TooltipTrigger><BadgeCheck className="h-5 w-5 text-blue-500" /></TooltipTrigger><TooltipContent><p>Onaylanmış Hesap</p></TooltipContent></Tooltip></TooltipProvider>
                    )}
                </div>
                 <h2 className="text-sm text-muted-foreground font-semibold flex items-center gap-1"><At size={14}/>{profileUser.uniqueTag}</h2>
                 {profileUser.bio && <p className="text-sm text-muted-foreground max-w-md">{profileUser.bio}</p>}
            </div>
             {isOwnProfile ? (
                 <Button asChild variant="secondary" size="icon">
                    <Link href="/profile"><Settings className="h-5 w-5"/></Link>
                </Button>
            ) : (
                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => handleStatClick('followers')}>Takipçiler</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => handleStatClick('following')}>Takip Edilenler</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setIsReportOpen(true)}>Şikayet Et</DropdownMenuItem>
                    <DropdownMenuItem onSelect={haveIBlockedThisUser ? handleUnblockUser : handleBlockUser} className="text-destructive focus:text-destructive">
                       {isBlocking ? <Loader2 className="animate-spin mr-2"/> : <ShieldOff className="mr-2 h-4 w-4"/>}
                       {haveIBlockedThisUser ? 'Engeli Kaldır' : 'Engelle'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
        
         <div className="space-y-2">
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-amber-400 fill-current" />
                    <span className="font-bold text-lg">Hediye Seviyesi {profileUser.giftLevel || 0}</span>
                </div>
                 {nextLevelInfo && <span className="text-xs text-muted-foreground">Sonraki Seviye: {nextLevelInfo.diamonds.toLocaleString('tr-TR')}</span>}
            </div>
            <Progress value={progress} className="h-3" />
        </div>

        <div className="grid grid-cols-2 gap-2">
             <Button asChild variant="outline">
                <Link href={`/wallet`}><Gem className="mr-2 h-4 w-4"/>Hediye Değeri: {profileUser.profileValue || 0}</Link>
            </Button>
            <Button variant="outline" onClick={() => setIsBadgesOpen(true)}>
                <Award className="mr-2 h-4 w-4"/> Rozetler
            </Button>
        </div>

        {!isOwnProfile && !haveIBlockedThisUser && (
            <div className="flex w-full gap-2">
                <FollowButton currentUserData={currentUserData} targetUser={profileUser} />
                <Button asChild className="flex-1">
                    <Link href={`/dm/${getChatId(currentUserAuth!.uid, profileUser.uid)}`}><MessageCircle className="mr-2 h-4 w-4"/> Mesaj</Link>
                </Button>
            </div>
        )}
      </div>

      <FollowListDialog
        isOpen={dialogOpen}
        onOpenChange={setDialogOpen}
        userIds={userIdsToShow || []}
        type={dialogType}
      />
       <SendDiamondDialog
        isOpen={sendDiamondOpen}
        onOpenChange={setSendDiamondOpen}
        recipient={profileUser}
      />
      <ReportDialog 
        isOpen={isReportOpen}
        onOpenChange={setIsReportOpen}
        target={{ type: 'user', id: profileUser.uid, name: profileUser.username }}
      />
       <BadgesDialog
        isOpen={isBadgesOpen}
        onOpenChange={setIsBadgesOpen}
        user={profileUser}
      />
    </>
  );
}
