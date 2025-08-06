// src/components/dm/ViewOnceDialog.tsx
'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { deleteMessageImage } from '@/lib/actions/dmActions';
import { useToast } from '@/hooks/use-toast';
import { Timer } from 'lucide-react';

interface ViewOnceDialogProps {
  imageUrl: string;
  onClose: () => void;
  chatId: string;
  messageId: string;
}

const VIEW_DURATION = 15; // 15 seconds

export default function ViewOnceDialog({ imageUrl, onClose, chatId, messageId }: ViewOnceDialogProps) {
  const [progress, setProgress] = useState(100);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          return 0;
        }
        return prev - (100 / VIEW_DURATION);
      });
    }, 1000);

    const closeTimeout = setTimeout(async () => {
      try {
        await deleteMessageImage(chatId, messageId, imageUrl);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Fotoğraf silinirken bir hata oluştu.',
        });
      } finally {
        onClose();
      }
    }, VIEW_DURATION * 1000);

    return () => {
      clearInterval(timer);
      clearTimeout(closeTimeout);
    };
  }, [onClose, chatId, messageId, imageUrl, toast]);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-0 max-w-4xl bg-black border-none flex flex-col items-center justify-center">
        <div className="absolute top-4 left-4 w-[calc(100%-32px)]">
           <div className="flex items-center gap-2 text-white">
            <Timer className="h-5 w-5"/>
             <Progress value={progress} className="w-full h-2" />
           </div>
        </div>
        <img
          src={imageUrl}
          alt="Süreli Fotoğraf"
          className="max-w-full max-h-[90vh] object-contain"
        />
      </DialogContent>
    </Dialog>
  );
}