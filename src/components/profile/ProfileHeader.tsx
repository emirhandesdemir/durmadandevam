// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings, Gem, MoreHorizontal, ShieldOff, UserCheck, Crown, Bookmark } from 'lucide-react';
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
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import type { UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

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
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;
  const areMutuals = currentUserData?.following?.includes(profileUser.uid) && profileUser.following?.includes(currentUserAuth?.uid);
  const amIBlockedByThisUser = profileUser.blockedUsers?.includes(currentUserAuth?.uid || '');
  const haveIBlockedThisUser = currentUserData?.blockedUsers?.includes(profileUser.uid);
  const isPremium = isClient && profileUser.premiumUntil && new Date(profileUser.premiumUntil as any) > new Date();


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
      <div className="flex flex-col items-center text-center p-4">
        {/* Avatar */}
         <div className={cn("avatar-frame-wrapper", profileUser.selectedAvatarFrame)}>
            <Avatar className="relative z-[1] h-24 w-24 md:h-28 md:w-28 border-4 border-background shadow-lg">
                <AvatarImage src={profileUser.photoURL || undefined} />
                <AvatarFallback className="text-5xl">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
        </div>

        {/* User Info */}
        <div className="mt-4">
            <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-bold">{profileUser.username}</h1>
                {isPremium && (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger><Crown className="h-6 w-6 text-yellow-500" /></TooltipTrigger>
                            <TooltipContent><p>Premium Üye</p></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </div>
          {isOwnProfile && (
            <div className="flex items-center justify-center gap-2 mt-1 text-cyan-400 font-bold">
                <Gem className="h-5 w-5"/>
                <span>{profileUser.diamonds || 0}</span>
            </div>
          )}
          {profileUser.bio && <p className="text-sm text-muted-foreground max-w-md mt-2">{profileUser.bio}</p>}
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
        <div className={cn(
            "mt-4 w-full max-w-sm flex justify-center items-center gap-2"
        )}>
           {isOwnProfile ? (
              <Button asChild variant="secondary" className="flex-1">
                  <Link href="/profile">
                    <Settings className="mr-2 h-4 w-4"/>
                    Profili ve Ayarları Düzenle
                  </Link>
              </Button>
            ) : haveIBlockedThisUser ? (
                 <Button onClick={handleUnblockUser} variant="destructive" className="w-full" disabled={isBlocking}>
                    {isBlocking ? <Loader2 className="animate-spin mr-2"/> : <UserCheck className="mr-2 h-4 w-4"/>}
                    Engeli Kaldır
                </Button>
            ) : (
                <>
                    <FollowButton currentUserData={currentUserData} targetUser={profileUser} />
                    <Button asChild className="flex-1">
                        <Link href={`/dm/${getChatId(currentUserAuth!.uid, profileUser.uid)}`}>
                           <MessageCircle className="mr-2 h-4 w-4"/> Mesaj
                        </Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon"><MoreHorizontal /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => setSendDiamondOpen(true)} disabled={!areMutuals}>
                          <Gem className="mr-2 h-4 w-4"/>Elmas Gönder
                        </DropdownMenuItem>
                         <DropdownMenuItem onSelect={() => setIsReportOpen(true)}>
                            Şikayet Et
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={handleBlockUser} className="text-destructive focus:text-destructive">
                           <ShieldOff className="mr-2 h-4 w-4"/> Engelle
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
    </>
  );
}
