{'use client';

import { useState, useRef, useEffect } from 'react';
import type { DirectMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Check, CheckCheck, MoreHorizontal, Pencil, Trash2, Loader2, Play, Pause, Image as ImageIcon, Camera, Timer } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteMessage, editMessage, toggleReaction, markImageAsOpened } from '@/lib/actions/dmActions';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import ViewOnceDialog from './ViewOnceDialog';

interface MessageBubbleProps {
  message: DirectMessage;
  currentUserId: string;
  chatId: string;
}

const REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '😢', '🔥'];

const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
};

const AudioPlayer = ({ audioUrl, duration }: { audioUrl: string; duration: number }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);
    
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const changePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
        setPlaybackRate(nextRate);
    };

    return (
        <div className="flex items-center gap-2 p-2 w-full max-w-[250px]">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1 h-1 bg-muted rounded-full relative">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-xs font-mono w-12 text-right">{formatTime(currentTime)}</span>
                <Button variant="outline" size="sm" className="w-12 text-xs" onClick={changePlaybackRate}>
                    {playbackRate}x
                </Button>
            </div>
        </div>
    );
};

const ViewOncePlaceholder = ({ onClick }: { onClick: () => void }) => {
    return (
        <button 
            onClick={onClick} 
            className="flex items-center justify-center gap-2 p-3 w-48 bg-muted/50 rounded-lg border-2 border-dashed hover:border-primary hover:bg-primary/10 transition-all"
        >
            <Timer className="h-5 w-5"/>
            <span className="font-semibold text-sm">Fotoğrafı Görüntüle</span>
        </button>
    )
}

/**
 * Sohbetteki tek bir mesaj baloncuğunu temsil eder.
 */
export default function MessageBubble({ message, currentUserId, chatId }: MessageBubbleProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.text || '');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [viewOnceImage, setViewOnceImage] = useState<string | null>(null);

  const isSender = message.senderId === currentUserId;
  const isReceiver = message.receiverId === currentUserId;
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
  
  const handleViewOnceClick = async () => {
    if (!isReceiver || !message.imageUrl) return;
    try {
        await markImageAsOpened(chatId, message.id, currentUserId);
        setViewOnceImage(message.imageUrl);
    } catch (error: any) {
        toast({ variant: 'destructive', description: 'Bu fotoğraf görüntülenemiyor.' });
    }
  };

  return (
    <>
      <div className={cn('flex flex-col gap-1', alignClass, hasReactions ? 'pb-4' : '')}>
        <div className={cn('flex items-end gap-2 max-w-[75%] group', isSender ? 'flex-row-reverse' : '')}>
             <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                {!isDeleted && !isEditing && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                         <DropdownMenuContent align={isSender ? "end" : "start"}>
                             <div className='flex gap-1 p-1'>
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
                  {message.imageType === 'timed' ? (
                      isReceiver && !message.imageOpened ? (
                          <ViewOncePlaceholder onClick={handleViewOnceClick} />
                      ) : (
                          <p className="text-sm italic opacity-70">Süreli fotoğrafın süresi doldu.</p>
                      )
                  ) : message.imageUrl ? (
                    <img src={message.imageUrl} alt="Gönderilen resim" className="rounded-lg max-w-xs max-h-64 object-cover cursor-pointer mb-2" onClick={() => window.open(message.imageUrl, '_blank')} />
                  ) : null}

                  {message.audioUrl && message.audioDuration ? (
                     <AudioPlayer audioUrl={message.audioUrl} duration={message.audioDuration} />
                  ) : null}
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
     {viewOnceImage && (
        <ViewOnceDialog 
            imageUrl={viewOnceImage} 
            onClose={() => setViewOnceImage(null)}
            chatId={chatId}
            messageId={message.id}
        />
     )}
    </>
  );
}
