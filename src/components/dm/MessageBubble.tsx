// src/components/dm/MessageBubble.tsx
'use client';

import { useState } from 'react';
import type { DirectMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, MoreHorizontal, Pencil, Trash2, Loader2, Smile } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteMessage, editMessage } from '@/lib/actions/dmActions';
import { Textarea } from '../ui/textarea'; // Import Textarea
import { Button } from '../ui/button'; // Import Button

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  chatId: string;
}

/**
 * Sohbetteki tek bir mesaj baloncuğunu temsil eder.
 * Artık mesaj düzenleme işlevini kendi içinde barındırır.
 */
export default function MessageBubble({ message, currentUserId, chatId }: MessageBubbleProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // --- New states for inline editing ---
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  // ---

  const isSender = message.senderId === currentUserId;
  const isDeleted = !!message.deleted;
  const alignClass = isSender ? 'items-end' : 'items-start';
  const bubbleClass = isSender
    ? 'bg-primary text-primary-foreground rounded-br-none'
    : 'bg-muted rounded-bl-none';

  const time = message.createdAt ? format(message.createdAt.toDate(), 'HH:mm') : '';

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

  // --- New handlers for inline editing ---
  const handleEditClick = () => {
    setEditedText(message.text || ''); // Reset text on each edit click
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedText(message.text || ''); // Revert to original text
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
  // ---

  return (
    <>
      <div className={cn('flex flex-col gap-1', alignClass)}>
        <div className="flex items-end gap-2 max-w-[75%] group">
          {!isSender && !isDeleted && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4"/></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem disabled><Smile className="mr-2 h-4 w-4"/> Tepki Ver</DropdownMenuItem>
                    <DropdownMenuItem disabled>Kopyala</DropdownMenuItem>
                    <DropdownMenuItem disabled>İlet</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
          )}

          <div className={cn('p-3 rounded-2xl relative', bubbleClass)}>
            {isDeleted ? (
              <p className="text-sm italic opacity-70">Bu mesaj silindi</p>
            ) : isEditing ? (
                // --- Editing UI ---
                <div className="space-y-2">
                    <Textarea
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        className="bg-background text-foreground min-h-[60px] resize-none"
                        autoFocus
                    />
                    <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={handleCancelEdit}>İptal</Button>
                        <Button size="sm" onClick={handleSaveEdit} disabled={isSavingEdit}>
                            {isSavingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Kaydet
                        </Button>
                    </div>
                </div>
                // --- End Editing UI ---
            ) : (
              <>
                {message.imageUrl && (
                    <img
                        src={message.imageUrl}
                        alt="Gönderilen resim"
                        className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer mb-2"
                        onClick={() => window.open(message.imageUrl, '_blank')}
                    />
                )}
                {message.text && (
                    <p className="text-sm break-words whitespace-pre-wrap">{message.text}</p>
                )}
              </>
            )}
          </div>

          {isSender && !isDeleted && !isEditing && (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4"/></button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                     <DropdownMenuItem disabled><Smile className="mr-2 h-4 w-4"/> Tepki Ver</DropdownMenuItem>
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
                </DropdownMenuContent>
            </DropdownMenu>
          )}
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