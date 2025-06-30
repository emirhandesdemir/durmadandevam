// src/components/dm/NewMessageInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage, editMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, X, Check, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { storage } from '@/lib/firebase';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import type { DirectMessage } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';


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
  editingMessage: DirectMessage | null;
  onEditDone: () => void;
}

const messageSchema = z.object({
  text: z.string().optional(),
});
type MessageFormValues = z.infer<typeof messageSchema>;

/**
 * Yeni bir özel mesaj göndermek veya mevcut bir mesajı düzenlemek için kullanılan form bileşeni.
 */
export default function NewMessageInput({ chatId, sender, receiver, editingMessage, onEditDone }: NewMessageInputProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, setValue, formState: { isSubmitting } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
  });
  
  const isEditing = !!editingMessage;

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When editingMessage changes, update the form value and focus the input
  useEffect(() => {
    if (editingMessage) {
      setValue('text', editingMessage.text || '');
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      // Clear the form when not in edit mode (e.g., after sending or cancelling)
      setValue('text', '');
    }
  }, [editingMessage, setValue]);


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
  
  const handleCancelEdit = () => {
    onEditDone();
    reset();
  }

  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    if (!user) return;
    
    // Logic for editing a message
    if (isEditing) {
        if (!data.text?.trim()) {
            toast({ variant: 'destructive', description: 'Mesaj boş olamaz.' });
            return;
        }
        try {
            await editMessage(chatId, editingMessage.id, data.text, user.uid);
            onEditDone();
        } catch (error: any) {
            toast({ title: 'Hata', description: `Mesaj düzenlenemedi: ${error.message}`, variant: 'destructive' });
        } finally {
            reset();
        }
        return;
    }

    // Logic for sending a new message
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
      toast({ title: 'Hata', description: `Mesaj gönderilemedi: ${error.message}`, variant: 'destructive' });
    }
  };

  const textValue = watch('text');
  const canSubmit = (textValue && textValue.trim()) || (file && !isEditing);
  const isLoading = isSubmitting || isUploading;

  return (
    <div className={cn(
        "bg-background transition-all duration-300",
        isEditing ? 'rounded-xl' : 'rounded-full'
    )}>
        {isEditing && (
            <div className="flex items-center justify-between p-2 px-3 border-b">
                <div className="flex items-center gap-2 overflow-hidden">
                    <Pencil className="h-4 w-4 text-primary shrink-0"/>
                    <div className="text-sm overflow-hidden">
                        <p className="font-semibold">Mesajı Düzenle</p>
                        <p className="text-xs text-muted-foreground truncate">"{editingMessage.text}"</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="rounded-full h-7 w-7" onClick={handleCancelEdit}>
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        )}
        {preview && file && !isEditing && (
            <div className='relative p-2 ml-2 mb-2 bg-background rounded-lg border w-fit'>
                <img src={preview} alt="Önizleme" className="max-h-24 rounded-md" />
                <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => setFile(null)}>
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        )}
        <form 
          onSubmit={handleSubmit(onSubmit)} 
          className={cn(
              "flex w-full items-center space-x-2 p-1",
              isEditing && "p-2"
            )}
        >
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" disabled={isEditing} />
            <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isEditing}>
                <ImagePlus className={cn('h-5 w-5 text-muted-foreground', isEditing && 'opacity-50 cursor-not-allowed')}/>
            </Button>
            <Input
                {...register('text')}
                ref={inputRef}
                placeholder={isEditing ? "Mesajınızı düzenleyin..." : "Bir mesaj yaz..."}
                autoComplete="off"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
                onKeyDown={(e) => {
                    if (e.key === 'Escape' && isEditing) {
                        handleCancelEdit();
                    }
                }}
            />
            <Button type="submit" size="icon" disabled={!canSubmit || isLoading} className="rounded-full flex-shrink-0 h-10 w-10">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isEditing ? <Check className="h-5 w-5" /> : <Send className="h-4 w-4" />)}
                <span className="sr-only">{isEditing ? 'Kaydet' : 'Gönder'}</span>
            </Button>
        </form>
    </div>
  );
}