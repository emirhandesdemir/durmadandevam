// src/components/profile/NewProfilePicturePostDialog.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { createProfileUpdatePost } from '@/lib/actions/postActions';
import { useRouter } from 'next/navigation';

interface NewProfilePicturePostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  newEmoji: string | null;
}

export default function NewProfilePicturePostDialog({ isOpen, onOpenChange, newEmoji }: NewProfilePicturePostDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [text, setText] = useState('#ProfilFotoğrafıGüncellendi ');
  const [isPosting, setIsPosting] = useState(false);

  const handlePublish = async () => {
    if (!user || !userData || !newEmoji) return;
    setIsPosting(true);
    try {
      await createProfileUpdatePost({
        userId: user.uid,
        username: userData.username,
        profileEmoji: newEmoji,
        text: text,
        userAvatarFrame: userData.selectedAvatarFrame,
        userRole: userData.role,
      });
      toast({ description: 'Gönderi başarıyla paylaşıldı.' });
      onOpenChange(false);
      router.push('/home');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: `Gönderi oluşturulurken bir hata oluştu: ${error.message}`,
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    router.push('/home'); // Still navigate to home after skipping
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni Profil Fotoğrafını Paylaş</DialogTitle>
          <DialogDescription>
            Profil fotoğrafı güncellemeni bir gönderi olarak paylaşmak ister misin?
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="flex justify-center items-center h-32 w-32 mx-auto rounded-full bg-muted border-4 border-primary">
            <span className="text-7xl">{newEmoji}</span>
          </div>
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Bir şeyler ekle..."
          />
        </div>
        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="outline" onClick={handleSkip}>
            Atla
          </Button>
          <Button onClick={handlePublish} disabled={isPosting}>
            {isPosting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Send className="mr-2 h-4 w-4" />
            Paylaş
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
