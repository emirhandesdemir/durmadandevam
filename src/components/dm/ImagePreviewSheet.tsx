// src/components/dm/ImagePreviewSheet.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendMessage } from '@/lib/actions/dmActions';
import { useToast } from '@/hooks/use-toast';
import type { UserInfo } from './DMChat';

interface ImagePreviewSheetProps {
  file: File | null;
  setFile: (file: File | null) => void;
  chatId: string;
  sender: UserInfo;
  receiver: UserInfo;
}

export default function ImagePreviewSheet({ file, setFile, chatId, sender, receiver }: ImagePreviewSheetProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [imageType, setImageType] = useState<'permanent' | 'timed'>('permanent');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleClose = () => {
    setFile(null);
    setCaption('');
  };

  const handleSend = async () => {
    if (!file || !preview) return;
    setIsSubmitting(true);
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onloadend = async () => {
            const base64Image = reader.result as string;
            await sendMessage(chatId, sender, receiver, { text: caption, imageUrl: base64Image, imageType });
            handleClose();
        };
    } catch (error: any) {
        toast({ variant: 'destructive', description: `Fotoğraf gönderilemedi: ${error.message}` });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={!!file} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="bottom" className="h-full w-full p-0 bg-black flex flex-col">
        <div className="flex-1 flex items-center justify-center relative">
          {preview && (
            <img src={preview} alt="Önizleme" className="max-w-full max-h-full object-contain" />
          )}
        </div>
        <div className="p-4 bg-black/50 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-3">
                <Input
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder="Başlık ekleyin..."
                    className="flex-1 bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-400 rounded-full h-11 px-4"
                />
                <Button 
                    variant="secondary" 
                    size="icon" 
                    className={cn(
                        "rounded-full h-11 w-11 flex-shrink-0 transition-colors",
                        imageType === 'timed' ? 'bg-primary text-primary-foreground' : 'bg-gray-800/80 text-white'
                    )}
                    onClick={() => setImageType(prev => prev === 'timed' ? 'permanent' : 'timed')}
                >
                    <Timer />
                </Button>
            </div>
             <Button onClick={handleSend} disabled={isSubmitting} size="lg" className="w-full bg-primary h-12 rounded-xl text-lg">
                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Gönder'}
            </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
