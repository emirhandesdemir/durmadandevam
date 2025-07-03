// src/components/dm/ChatListItem.tsx
'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { DirectMessageMetadata } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import { Check, CheckCheck, Pin, PinOff, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { togglePinChat, hideChat } from '@/lib/actions/dmActions';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '../ui/button';

interface ChatListItemProps {
  chat: DirectMessageMetadata;
  currentUserId: string;
  isSelected: boolean;
}

export default function ChatListItem({ chat, currentUserId, isSelected }: ChatListItemProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
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

  const handleTogglePin = async () => {
    setIsProcessing(true);
    try {
        const result = await togglePinChat(chat.id, currentUserId);
        if (result.success) {
            toast({ description: result.newState ? "Sohbet sabitlendi." : "Sabitlenmiş sohbet kaldırıldı." });
        } else {
            throw new Error(result.error);
        }
    } catch(e: any) {
        toast({ variant: 'destructive', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDeleteChat = async () => {
    setIsProcessing(true);
    try {
        await hideChat(chat.id, currentUserId);
        toast({ description: "Sohbet gizlendi." });
        setShowDeleteConfirm(false);
    } catch(e: any) {
        toast({ variant: 'destructive', description: e.message });
    } finally {
        setIsProcessing(false);
    }
  };


  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div onContextMenu={(e) => e.preventDefault()} className="w-full cursor-pointer rounded-lg">
            <Link href={`/dm/${chat.id}`} className="block">
              <div className={cn(
                "flex items-center gap-4 p-3 border-b hover:bg-muted/50 transition-colors",
                isSelected ? "bg-muted" : (isUnread ? "bg-primary/10" : "bg-card")
              )}>
                <div className="relative">
                  <div className={cn("avatar-frame-wrapper", partnerFrame)}>
                    <Avatar className="relative z-[1] h-12 w-12">
                      <AvatarImage src={partnerInfo.photoURL || undefined} />
                      <AvatarFallback>{partnerInfo.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </div>
                  {isUnread && !isSelected && (
                      <span className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-primary ring-2 ring-background" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        {isPinned && <Pin className="h-4 w-4 text-primary" />}
                        <h3 className={cn("truncate", isUnread && !isSelected ? "font-bold text-foreground" : "font-semibold")}>{partnerInfo.username}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{timeAgo}</p>
                  </div>
                  <div className="flex justify-between items-start mt-1">
                    <p className={cn(
                        "text-sm truncate pr-2", 
                        isUnread && !isSelected ? "text-primary font-bold" : "text-muted-foreground"
                    )}>
                      {lastMessage && lastMessage.senderId === currentUserId && (
                        <span className="inline-block mr-1">
                            {lastMessage.read ? <CheckCheck className="h-4 w-4 text-primary" /> : <Check className="h-4 w-4 text-muted-foreground" />}
                        </span>
                      )}
                      {lastMessage?.text || 'Sohbet başlatıldı'}
                    </p>
                    {isUnread && !isSelected && (
                      <Badge variant="default" className="h-6 min-w-[24px] flex items-center justify-center p-1 text-xs shrink-0">{unreadCount}</Badge>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuItem onClick={handleTogglePin} disabled={isProcessing}>
                {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : (isPinned ? <PinOff className="mr-2 h-4 w-4"/> : <Pin className="mr-2 h-4 w-4"/>)}
                <span>{isPinned ? 'Sabitlemeyi Kaldır' : 'Sohbeti Sabitle'}</span>
            </DropdownMenuItem>
             <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Sohbeti Sil</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

       <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Sohbeti Sil?</AlertDialogTitle>
                <AlertDialogDescription>Bu sohbet gelen kutunuzdan kaldırılacak. Bu işlem geri alınamaz. Karşı taraf bu durumdan etkilenmez.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteChat} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sil
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
