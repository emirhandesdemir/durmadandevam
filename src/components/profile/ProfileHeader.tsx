// src/components/profile/ProfileHeader.tsx
'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, Settings, Gem, MoreHorizontal, ShieldOff, UserCheck, Crown, Bookmark, Copy, Shield, BadgeCheck, Star, Gift, Users } from 'lucide-react';
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
import { Separator } from '../ui/separator';
import ProfileGiftDialog from './ProfileGiftDialog';
import { joinRoom } from '@/lib/actions/roomActions';

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
  uniqueTag?: number;
  giftLevel?: number;
  role?: 'admin' | 'user';
  emailVerified?: boolean;
  activeRoomId?: string | null;
  activeRoomName?: string | null;
  showActiveRoom?: boolean;
  diamonds?: number;
}

interface ProfileHeaderProps {
  profileUser: UserProfile;
}

const BadgeItem = ({ icon: Icon, label, color }: { icon: React.ElementType, label: string, color?: string }) => (
    <div className="flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full bg-muted border">
        <div className={cn("p-1.5 bg-background rounded-full", color)}>
             <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold">{label}</span>
    </div>
);

export default function ProfileHeader({ profileUser }: ProfileHeaderProps) {
  const { user: currentUserAuth, userData: currentUserData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<'followers' | 'following'>('followers');
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const isOwnProfile = currentUserAuth?.uid === profileUser.uid;
  const amIBlockedByThisUser = profileUser.blockedUsers?.includes(currentUserAuth?.uid || '');
  const haveIBlockedThisUser = currentUserData?.blockedUsers?.includes(profileUser.uid);
  const isPremium = profileUser.premiumUntil && new Date(profileUser.premiumUntil.seconds * 1000) > new Date();

  const handleJoinActiveRoom = async () => {
    if (!profileUser.activeRoomId || !currentUserData) return;
    setIsJoiningRoom(true);
    try {
        await joinRoom(profileUser.activeRoomId, {
            uid: currentUserData.uid,
            username: currentUserData.username,
            photoURL: currentUserData.photoURL,
        });
        router.push(`/rooms/${profileUser.activeRoomId}`);
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    } finally {
        setIsJoiningRoom(false);
    }
  };


  const handleStatClick = (type: 'followers' | 'following') => {
    setDialogType(type);
    setDialogOpen(true);
  };
  
   const copyIdToClipboard = () => {
        if(!profileUser.uniqueTag) return;
        navigator.clipboard.writeText(`@${profileUser.uniqueTag}`);
        toast({
            description: "Kullanıcı ID'si kopyalandı!",
        });
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
        <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
                <Avatar className={cn("h-20 w-20 border-4", isPremium ? "border-amber-400" : "border-background")}>
                    <AvatarImage src={profileUser.photoURL || undefined} />
                    <AvatarFallback className="text-3xl bg-muted">{profileUser.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1 mt-2">
                    <h1 className="text-2xl font-bold">{profileUser.username}</h1>
                     <div className="flex items-center gap-1 text-muted-foreground">
                        <p className="text-base">@{profileUser.uniqueTag}</p>
                        <Button onClick={copyIdToClipboard} variant="ghost" size="icon" className="h-7 w-7"><Copy className="h-4 w-4"/></Button>
                    </div>
                </div>
            </div>
            {isOwnProfile && (
                 <div className="flex items-center gap-2 mt-2">
                    <Button asChild size="sm" className="rounded-full">
                        <Link href="/wallet">
                            <Gem className="mr-2 h-4 w-4"/>
                            <span>{currentUserData?.diamonds?.toLocaleString('tr-TR') || 0}</span>
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="icon" className="rounded-full">
                        <Link href="/profile"><Settings className="h-5 w-5"/></Link>
                    </Button>
                </div>
            )}
        </div>
        
        {profileUser.bio && <p className="text-sm text-foreground/80">{profileUser.bio}</p>}

        {!isOwnProfile && profileUser.showActiveRoom && profileUser.activeRoomId && (
            <button 
                onClick={handleJoinActiveRoom} disabled={isJoiningRoom}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
            >
                <div className="text-sm text-left">
                    <p className="text-muted-foreground">Şu anda bu odada:</p>
                    <p className="font-bold truncate">{profileUser.activeRoomName}</p>
                </div>
                {isJoiningRoom ? <Loader2 className="h-5 w-5 animate-spin"/> : <span className='font-semibold text-sm'>Katıl</span>}
            </button>
        )}

        <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground">Rozetler</p>
             <div className="flex flex-wrap gap-2">
                <BadgeItem icon={Star} label={`Seviye ${profileUser.giftLevel || 0}`} color="text-yellow-500" />
                {isPremium && <BadgeItem icon={Crown} label="Premium" color="text-amber-500" />}
                {profileUser.role === 'admin' && <BadgeItem icon={Shield} label="Yönetici" color="text-destructive" />}
                {profileUser.emailVerified && <BadgeItem icon={BadgeCheck} label="Onaylı" color="text-blue-500" />}
            </div>
        </div>

        {!isOwnProfile && !haveIBlockedThisUser && (
            <div className="flex w-full gap-2">
                <FollowButton currentUserData={currentUserData} targetUser={profileUser} />
                <Button asChild className="flex-1">
                    <Link href={`/dm/${getChatId(currentUserAuth!.uid, profileUser.uid)}`}><MessageCircle className="mr-2 h-4 w-4"/> Mesaj</Link>
                </Button>
                 <Button onClick={() => setIsGiftOpen(true)} size="icon" variant="outline"><Gift className="h-5 w-5 text-primary"/></Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon"><MoreHorizontal /></Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setIsReportOpen(true)}>Şikayet Et</DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlockUser} className="text-destructive focus:text-destructive">
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

       <div className="flex items-center justify-around text-center py-3 border-y bg-muted/50">
            <div className="text-sm">
                <p className="font-bold text-base">{profileUser.postCount}</p>
                <p className="text-muted-foreground">gönderi</p>
            </div>
            <button onClick={() => handleStatClick('followers')} className="text-sm">
                <p className="font-bold text-base">{profileUser.followers?.length || 0}</p>
                <p className="text-muted-foreground">takipçi</p>
            </button>
            <button onClick={() => handleStatClick('following')} className="text-sm">
                <p className="font-bold text-base">{profileUser.following?.length || 0}</p>
                <p className="text-muted-foreground">takip</p>
            </button>
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
       <ProfileGiftDialog
        isOpen={isGiftOpen}
        onOpenChange={setIsGiftOpen}
        recipient={profileUser}
      />
    </>
  );
}
