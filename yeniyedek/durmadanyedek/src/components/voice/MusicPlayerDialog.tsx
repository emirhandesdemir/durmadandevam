
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { ScrollArea } from '../ui/scroll-area';
import { Music, Plus, Play, Pause, SkipForward, SkipBack, Trash2, ListMusic, User, Loader2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface MusicPlayerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
}

export default function MusicPlayerDialog({ isOpen, onOpenChange, roomId }: MusicPlayerDialogProps) {
    const { user } = useAuth();
    const {
        livePlaylist,
        isCurrentUserDj,
        isDjActive,
        currentTrack,
        addTrackToPlaylist,
        removeTrackFromPlaylist,
        togglePlayback,
        skipTrack,
    } = useVoiceChat();
    const musicInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;
    
        setIsAdding(true);
        let addedCount = 0;
    
        for (const file of Array.from(files)) {
            if (file.size > 15 * 1024 * 1024) { // 15MB limit
                toast({
                    variant: "destructive",
                    title: "Dosya Çok Büyük",
                    description: `"${file.name}" (15MB'dan büyük) atlandı.`
                });
                continue; // Skip this file and continue with the next
            }
    
            try {
                const fileDataUrl = await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.onerror = (error) => reject(error);
                });
                
                await addTrackToPlaylist({
                    fileName: file.name,
                    fileDataUrl,
                });
                
                addedCount++;
    
            } catch (error: any) {
                toast({
                    variant: "destructive",
                    description: `"${file.name}" eklenirken bir hata oluştu: ${error.message}`
                });
            }
        }
    
        if (addedCount > 0) {
            toast({
                title: "Başarılı",
                description: `${addedCount} şarkı çalma listesine eklendi.`
            });
        }
    
        setIsAdding(false);
        if (event.target) {
            event.target.value = ""; // Reset file input
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><ListMusic /> Müzik Çalar</DialogTitle>
                <DialogDescription>Oda için ortak bir çalma listesi oluşturun. Sadece bir kişi DJ olabilir.</DialogDescription>
            </DialogHeader>

            <div className="flex-1 flex flex-col gap-4 py-4 overflow-hidden">
                {/* Player Controls */}
                <div className="p-3 rounded-lg bg-muted flex flex-col items-center justify-center min-h-[120px]">
                    {currentTrack ? (
                        <p className="font-semibold text-center truncate">{currentTrack.name}</p>
                    ) : (
                        <p className="text-sm text-muted-foreground">Şu anda çalan bir şey yok.</p>
                    )}
                    <div className="flex items-center gap-2 mt-4">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skipTrack('previous')} disabled={!isCurrentUserDj}>
                            <SkipBack />
                        </Button>
                        <Button variant="default" size="icon" className="rounded-full h-14 w-14" onClick={togglePlayback} disabled={!isCurrentUserDj && isDjActive}>
                            {currentTrack?.isPlaying ? <Pause size={24}/> : <Play size={24}/>}
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => skipTrack('next')} disabled={!isCurrentUserDj}>
                            <SkipForward />
                        </Button>
                    </div>
                </div>

                 <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Sıradaki Şarkılar</h4>
                    <input type="file" ref={musicInputRef} onChange={handleFileChange} accept="audio/*,.mp3,.m4a,.wav,.ogg" className="hidden" multiple />
                    <Button variant="outline" size="sm" onClick={() => musicInputRef.current?.click()} disabled={isAdding}>
                        {isAdding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Plus className="mr-2 h-4 w-4" /> }
                         Müzik Ekle
                    </Button>
                </div>
                
                {/* Playlist */}
                <ScrollArea className="flex-1 rounded-md border">
                    <div className="p-2">
                        {livePlaylist.length > 0 ? (
                            livePlaylist.map((track, index) => (
                                <div key={track.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                                    <Music className="h-4 w-4 text-muted-foreground"/>
                                    <div className="flex-1">
                                        <p className="text-sm truncate">{track.name}</p>
                                        <p className="text-xs text-muted-foreground flex items-center gap-1"><User className="h-3 w-3"/>{track.addedByUsername}</p>
                                    </div>
                                    {(isCurrentUserDj || track.addedByUid === user?.uid) && (
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeTrackFromPlaylist(track.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-sm text-muted-foreground p-4">Çalma listesi boş.</p>
                        )}
                    </div>
                </ScrollArea>
            </div>
            
            <DialogFooter>
                <Button variant="secondary" onClick={() => onOpenChange(false)}>Kapat</Button>
            </DialogFooter>
        </DialogContent>
        </Dialog>
    );
}
