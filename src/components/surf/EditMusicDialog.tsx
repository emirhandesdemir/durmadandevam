'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Loader2, CheckCircle, X } from 'lucide-react';
import type { Post } from '@/lib/types';
import { updatePostMusic } from '@/lib/actions/postActions';

const royaltyFreeMusic = [
  { title: "Upbeat Funk", url: "https://cdn.pixabay.com/download/audio/2022/08/04/audio_2bbe6a8d0a.mp3" },
  { title: "Chill Lofi", url: "https://cdn.pixabay.com/download/audio/2022/02/10/audio_b42e7c4f75.mp3" },
  { title: "Inspiring Cinematic", url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_88c382fbb2.mp3" },
  { title: "Happy Whistle", url: "https://cdn.pixabay.com/download/audio/2022/06/14/audio_f5d13d7f95.mp3" },
  { title: "Epic Adventure", url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_511b816a75.mp3" }
];

interface EditMusicDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export default function EditMusicDialog({ isOpen, onOpenChange, post }: EditMusicDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedMusicUrl, setSelectedMusicUrl] = useState<string | null>(post.musicUrl || null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await updatePostMusic(post.id, selectedMusicUrl);
      toast({ description: "Videonun müziği güncellendi." });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', description: "Müzik güncellenirken bir hata oluştu." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Müziği Değiştir</DialogTitle>
          <DialogDescription>Videonuz için yeni bir arka plan müziği seçin.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
            <ScrollArea className="h-72 rounded-md border p-2">
                <div className="space-y-2">
                    {royaltyFreeMusic.map(music => (
                        <button key={music.title} onClick={() => setSelectedMusicUrl(music.url)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary rounded-md"><Music className="h-5 w-5"/></div>
                                <span className="text-sm font-medium">{music.title}</span>
                            </div>
                            {selectedMusicUrl === music.url && <CheckCircle className="h-5 w-5 text-primary"/>}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter className="justify-between">
           <Button variant="outline" onClick={() => setSelectedMusicUrl(null)} disabled={isSaving}>
              <X className="mr-2 h-4 w-4" /> Müziği Kaldır
            </Button>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>İptal</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Kaydet
              </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
