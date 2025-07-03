// src/components/dm/ChatListItem.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DirectMessageMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, Pin, MoreHorizontal, Trash2, ShieldOff, Loader2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteDirectMessage, togglePinChat } from '@/lib/actions/dmActions';
import { blockUser } from '@/lib/actions/userActions';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import Link from 'next/link';
import useLongPress from '@/hooks/useLongPress';

interface ChatListItemProps {
  chat: DirectMessageMetadata;
  currentUserId: string;
}

export default function ChatListItem({ chat, currentUserId }: ChatListItemProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { userData: currentUserData } = useAuth();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const partnerId = chat.participantUids.find(uid => uid !== currentUserId);
  if (!partnerId) return null;
  const partnerInfo = chat.participantInfo[partnerId];
  if (!partnerInfo) return null;
  
  const lastMessage = chat.lastMessage;
  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;
  const isUnread = unreadCount > 0;
  const partnerFrame = partnerInfo.selectedAvatarFrame || '';
  const isPinned = chat.pinnedBy?.includes(currentUserId);

  const timeAgo = lastMessage
    ? formatDistanceToNow(lastMessage.timestamp.toDate(), { addSuffix: true, locale: tr })
    : '';

  const handleContainerClick = () => {
    if (showActions) {
      setShowActions(false);
    } else {
      router.push(`/dm/${chat.id}`);
    }
  };

  const handleLongPress = () => {
    setShowActions(true);
  };
  
  const longPressEvents = useLongPress(handleLongPress, handleContainerClick, { delay: 400 });

  const handleAction = async (action: () => Promise<any>, successMessage: string) => {
    setIsProcessing(true);
    try {
      await action();
      toast({ description: successMessage });
    } catch (e: any) {
      toast({ variant: 'destructive', description: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePinToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleAction(
      () => togglePinChat(chat.id, currentUserId),
      isPinned ? "Sabitleme kaldırıldı." : "Sohbet sabitlendi."
    );
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    handleAction(
        () => deleteDirectMessage(chat.id, currentUserId),
        "Sohbet kalıcı olarak silindi."
    );
  }

  const handleBlock = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!currentUserData) return;
      handleAction(
          () => blockUser(currentUserData.uid, partnerId),
          `${partnerInfo.username} engellendi.`
      )
  };

  return (
    <>
      <div 
        {...longPressEvents}
        className={cn(
            "group relative flex items-center gap-4 p-3 border-b transition-colors cursor-pointer",
            isUnread ? "bg-primary/10" : "bg-card hover:bg-muted/50",
            showActions && "bg-muted/80"
        )}
      >
        <div className="relative z-20">
          <div className={cn("avatar-frame-wrapper", partnerFrame)}>
            <Avatar className="relative z-[1] h-12 w-12">
              <AvatarImage src={partnerInfo.photoURL || undefined} />
              <AvatarFallback>{partnerInfo.username.charAt(0)}</AvatarFallback>
            </Avatar>
          </div>
          {isUnread && (
            <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background" />
          )}
        </div>
        
        <div className="flex-1 overflow-hidden z-20">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {isPinned && <Pin className="h-4 w-4 text-primary" />}
              <h3 className={cn("truncate", isUnread ? "font-bold text-foreground" : "font-semibold")}>
                  <Link href={`/profile/${partnerId}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                    {partnerInfo.username}
                  </Link>
              </h3>
            </div>
            <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
          </div>
          <div className="flex justify-between items-start mt-1">
            <p className={cn("text-sm truncate pr-2", isUnread ? "font-semibold" : "text-muted-foreground")}>
              {lastMessage && lastMessage.senderId === currentUserId && (
                <span className="inline-block mr-1">
                  {lastMessage.read ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />}
                </span>
              )}
              {lastMessage?.text || 'Sohbet başlatıldı'}
            </p>
            {isUnread && (
              <Badge variant="default" className="h-6 min-w-[24px] flex items-center justify-center p-1 text-xs shrink-0">{unreadCount}</Badge>
            )}
          </div>
        </div>
        
        <div className={cn("ml-auto transition-opacity", showActions ? "opacity-100" : "opacity-0")}>
            <DropdownMenu open={isMenuOpen} onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setShowActions(false); }}>
                <DropdownMenuTrigger asChild>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 rounded-full" 
                        onClick={e => e.stopPropagation()}
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent onClick={e => e.stopPropagation()} align="end">
                    <DropdownMenuItem onClick={handlePinToggle}>
                        <Pin className="mr-2 h-4 w-4" />
                        <span>{isPinned ? "Sabitlemeyi Kaldır" : "Sohbeti Sabitle"}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleBlock}>
                        <ShieldOff className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Engelle</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                        <span className="text-destructive">Sohbeti Sil</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sohbeti Silinsin mi?</AlertDialogTitle>
                <AlertDialogDescription>
                    Bu işlem geri alınamaz. Sohbet ve içindeki tüm mesajlar kalıcı olarak silinecektir.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                    Sil
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
