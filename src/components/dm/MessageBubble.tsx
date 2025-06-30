// src/components/dm/MessageBubble.tsx
'use client';

import { useState } from 'react';
import type { DirectMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, MoreHorizontal, Pencil, Trash2, Loader2, Smile } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuPortal, DropdownMenuSubContent } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteMessage, editMessage, toggleReaction } from '@/lib/actions/dmActions';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  chatId: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😢', '🔥'];

/**
 * Sohbetteki tek bir mesaj baloncuğunu temsil eder.
 * Artık mesaj düzenleme ve tepki verme işlevlerini barındırır.
 */
export default function MessageBubble({ message, currentUserId, chatId }: MessageBubbleProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const isSender = message.senderId === currentUserId;
  const isDeleted = !!message.deleted;
  const alignClass = isSender ? 'items-end' : 'items-start';
  const bubbleClass = isSender
    ? 'bg-primary text-primary-foreground rounded-br-none'
    : 'bg-muted rounded-bl-none';

  const time = message.createdAt ? format(message.createdAt.toDate(), 'HH:mm') : '';

  const reactions = message.reactions || {};
  const hasReactions = Object.keys(reactions).length > 0;

  const handleDelete = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
        await deleteMessage(chatId, message.id, user.uid);
        setShowDeleteConfirm(false);
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message || 'Mesaj silinemedi.' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleEditClick = () => {
    setEditedText(message.text || '');
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(message.text || '');
  };

  const handleSaveEdit = async () => {
    if (!user || !editedText.trim()) return;
    setIsSavingEdit(true);
    try {
        await editMessage(chatId, message.id, editedText, user.uid);
        setIsEditing(false);
    } catch (error: any) {
        toast({ variant: 'destructive', description: `Mesaj düzenlenemedi: ${error.message}` });
    } finally {
        setIsSavingEdit(false);
    }
  };

  const handleReactionClick = async (emoji: string) => {
    if (!user) return;
    try {
      await toggleReaction(chatId, message.id, emoji, user.uid);
    } catch (error: any) {
      toast({ variant: 'destructive', description: 'Tepki verilemedi.' });
    }
  };

  return (
    <>
      <div className={cn('flex flex-col gap-1', alignClass, hasReactions ? 'pb-4' : '')}>
        <div className={cn('flex items-end gap-2 max-w-[75%] group', isSender ? 'flex-row-reverse' : '')}>

          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            {!isDeleted && !isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Smile className="mr-2 h-4 w-4" />
                      <span>Tepki Ver</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent className="p-0">
                          <div className="flex gap-1 p-1">
                              {REACTION_EMOJIS.map(emoji => (
                                  <DropdownMenuItem 
                                      key={emoji} 
                                      onClick={(e) => { e.preventDefault(); handleReactionClick(emoji); }}
                                      className="p-1.5 rounded-full hover:bg-accent focus:bg-accent cursor-pointer h-auto w-auto"
                                  >
                                      <span className="text-xl">{emoji}</span>
                                  </DropdownMenuItem>
                              ))}
                          </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>

                  {isSender && (
                    <>
                      <DropdownMenuSeparator />
                      {message.text && (
                        <DropdownMenuItem onClick={handleEditClick}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Düzenle
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setShowDeleteConfirm(true)} className="text-destructive focus:text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Sil
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <div className="relative">
            <div className={cn('p-3 rounded-2xl', bubbleClass)}>
              {isDeleted ? (
                <p className="text-sm italic opacity-70">Bu mesaj silindi</p>
              ) : isEditing ? (
                <div className="space-y-2">
                  <Textarea value={editedText} onChange={(e) => setEditedText(e.target.value)} className="bg-background text-foreground min-h-[60px] resize-none" autoFocus />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={handleCancelEdit}>İptal</Button>
                    <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                      {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Kaydet
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {message.imageUrl && (
                    <img src={message.imageUrl} alt="Gönderilen resim" className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer mb-2" onClick={() => window.open(message.imageUrl, '_blank')} />
                  )}
                  {message.text && (
                    <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                  )}
                </>
              )}
            </div>

            {hasReactions && (
              <div className={cn("absolute -bottom-4 flex items-center gap-1", isSender ? "right-0" : "left-0")}>
                {Object.entries(reactions).map(([emoji, uids]) => {
                  if (uids.length === 0) return null;
                  return (
                    <button key={emoji} onClick={() => handleReactionClick(emoji)} className={cn("flex items-center gap-1 px-2 py-0.5 rounded-full border bg-background text-xs shadow-sm transition-colors", uids.includes(currentUserId) ? "border-primary bg-primary/10" : "hover:bg-accent")}>
                      <span>{emoji}</span>
                      <span className="font-medium text-foreground">{uids.length}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2">
            {message.edited && !isDeleted && <span className="text-xs text-muted-foreground italic">düzenlendi</span>}
            <span className="text-xs text-muted-foreground">{time}</span>
            {isSender && !isDeleted && (
                message.read
                ? <CheckCheck className="h-4 w-4 text-primary" />
                : <Check className="h-4 w-4 text-muted-foreground" />
            )}
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Mesajı Sil?</AlertDialogTitle>
                <AlertDialogDescription>Bu mesaj kalıcı olarak silinecektir. Bu işlem geri alınamaz.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel disabled={isProcessing}>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sil
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}