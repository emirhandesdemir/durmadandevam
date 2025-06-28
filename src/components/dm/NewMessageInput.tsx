// src/components/dm/NewMessageInput.tsx
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';

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
  text: z.string().min(1, "Mesaj boş olamaz."),
});
type MessageFormValues = z.infer<typeof messageSchema>;

/**
 * Yeni bir özel mesaj göndermek için kullanılan form bileşeni.
 */
export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
  });

  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    try {
      await sendMessage(chatId, sender, receiver, data.text);
      reset();
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: `Mesaj gönderilemedi: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex w-full items-center space-x-2">
      <Input
        {...register('text')}
        placeholder="Bir mesaj yaz..."
        autoComplete="off"
        className="rounded-full flex-1 py-5"
        disabled={isSubmitting}
      />
      <Button type="submit" size="icon" disabled={isSubmitting} className="rounded-full flex-shrink-0">
        {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        <span className="sr-only">Gönder</span>
      </Button>
    </form>
  );
}
