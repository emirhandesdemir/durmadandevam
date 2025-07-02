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
import { Music, Plus, Play, Pause, SkipForward, SkipBack, Trash2, ListMusic } from 'lucide-react';
import { useRef } from 'react';
import { Slider } from '../ui/slider';
import { Label } from '../ui/label';

interface MusicPlayerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function MusicPlayerDialog({ isOpen, onOpenChange }: MusicPlayerDialogProps) {
  const {
    playlist,
    currentTrackIndex,
    addToPlaylist,
    removeFromPlaylist,
    isMusicPlaying,
    togglePlayPause,
    playNextTrack,
    playPreviousTrack,
    musicVolume,
    setMusicVolume,
  } = useVoiceChat();
  const musicInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      addToPlaylist(file);
    }
    // Reset input to allow selecting the same file again
    if (event.target) {
      event.target.value = "";
    }
  };

  const currentTrack = currentTrackIndex !== -1 ? playlist[currentTrackIndex] : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ListMusic /> Müzik Çalar</DialogTitle>
          <DialogDescription>
            Sıraya müzik ekleyin ve oda için DJ olun.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4">
          <div className="p-3 rounded-lg bg-muted flex flex-col items-center justify-center min-h-[80px]">
            {currentTrack ? (
                <p className="font-semibold text-center truncate">{currentTrack.name}</p>
            ) : (
                <p className="text-sm text-muted-foreground">Şu anda çalan bir şey yok.</p>
            )}
            <div className="flex items-center gap-2 mt-4">
                <Button variant="ghost" size="icon" className="rounded-full" onClick={playPreviousTrack} disabled={currentTrackIndex <= 0}>
                    <SkipBack />
                </Button>
                <Button variant="default" size="icon" className="rounded-full h-14 w-14" onClick={togglePlayPause} disabled={playlist.length === 0}>
                    {isMusicPlaying ? <Pause size={24}/> : <Play size={24}/>}
                </Button>
                 <Button variant="ghost" size="icon" className="rounded-full" onClick={playNextTrack} disabled={currentTrackIndex >= playlist.length - 1}>
                    <SkipForward />
                </Button>
            </div>
            <div className="w-full mt-4 space-y-2 px-4">
                <Label className="text-xs">Ses Düzeyi</Label>
                <Slider
                    value={[musicVolume]}
                    onValueChange={(value) => setMusicVolume(value[0])}
                    min={0}
                    max={1}
                    step={0.05}
                />
            </div>
          </div>

          <div className="flex justify-between items-center">
             <h4 className="font-semibold">Sıradaki Şarkılar</h4>
             <input type="file" ref={musicInputRef} onChange={handleFileChange} accept="audio/*" className="hidden" />
             <Button variant="outline" size="sm" onClick={() => musicInputRef.current?.click()}>
                <Plus className="mr-2 h-4 w-4" /> Müzik Ekle
             </Button>
          </div>

          <ScrollArea className="h-48 rounded-md border">
            <div className="p-2">
                {playlist.length > 0 ? (
                    playlist.map((track, index) => (
                        <div key={`${track.name}-${index}`} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted">
                            <Music className="h-4 w-4 text-muted-foreground"/>
                            <p className="flex-1 text-sm truncate">{track.name}</p>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeFromPlaylist(index)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                            </Button>
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
