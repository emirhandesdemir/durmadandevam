// src/components/dm/NewMessageInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  selectedAvatarFrame?: string;
}

interface NewMessageInputProps {
  chatId: string;
  sender: UserInfo;
  receiver: UserInfo;
}

const messageSchema = z.object({
  text: z.string().optional(),
});
type MessageFormValues = z.infer<typeof messageSchema>;

/**
 * Yeni bir özel mesaj göndermek için kullanılan form bileşeni.
 */
export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting, isValid } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.type.startsWith('image/')) {
        toast({ variant: 'destructive', description: "Sadece resim dosyaları gönderilebilir." });
        return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) { // 5MB limit
        toast({ variant: 'destructive', description: "Dosya boyutu 5MB'dan büyük olamaz." });
        return;
    }
    setFile(selectedFile);
  };

  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    let imageUrl: string | undefined;

    if (!data.text?.trim() && !file) return;

    if (file) {
        setIsUploading(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = e => resolve(e.target?.result as string);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });
            
            const path = `upload/dms/${chatId}/${uuidv4()}`;
            const storageRef = ref(storage, path);
            await uploadString(storageRef, dataUrl, 'data_url');
            imageUrl = await getDownloadURL(storageRef);
        } catch (error) {
            toast({ variant: 'destructive', description: "Resim yüklenemedi." });
            setIsUploading(false);
            return;
        } finally {
            setIsUploading(false);
        }
    }
    
    try {
      await sendMessage(chatId, sender, receiver, data.text, imageUrl);
      reset();
      setFile(null);
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: `Mesaj gönderilemedi: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  const textValue = watch('text');
  const canSubmit = (textValue && textValue.trim()) || file;

  return (
    <div>
        {preview && file && (
            <div className='relative p-2 mb-2 bg-background rounded-lg border w-fit'>
                <img src={preview} alt="Önizleme" className="max-h-24 rounded-md" />
                <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => setFile(null)}>
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        )}
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className={cn("flex w-full items-center space-x-2 bg-background rounded-full p-1")}
        >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting || isUploading}>
                <ImagePlus className='h-5 w-5 text-muted-foreground' />
            </Button>
            <Input
                {...register('text')}
                placeholder="Bir mesaj yaz..."
                autoComplete="off"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isSubmitting || isUploading}
            />
            <Button type="submit" size="icon" disabled={!canSubmit || isSubmitting || isUploading} className="rounded-full flex-shrink-0 h-10 w-10">
                {(isSubmitting || isUploading) ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Gönder</span>
            </Button>
        </form>
    </div>
  );
}
