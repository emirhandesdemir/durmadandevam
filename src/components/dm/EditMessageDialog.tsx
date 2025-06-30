// src/components/dm/EditMessageDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { editMessage } from '@/lib/actions/dmActions';
import type { DirectMessage } from '@/lib/types';
import { Loader2 } from 'lucide-react';

interface EditMessageDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  message: DirectMessage;
  chatId: string;
}

const editSchema = z.object({
  newText: z.string().min(1, 'Mesaj boş olamaz.'),
});
type EditFormValues = z.infer<typeof editSchema>;

/**
 * Mesaj düzenlemek için kullanılan diyalog penceresi.
 */
export default function EditMessageDialog({ isOpen, onOpenChange, message, chatId }: EditMessageDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { isSubmitting }, reset } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { newText: message.text },
  });

  const onSubmit: SubmitHandler<EditFormValues> = async (data) => {
    if (!user) return;
    try {
      await editMessage(chatId, message.id, data.newText, user.uid);
      onOpenChange(false);
      reset();
    } catch (error: any) {
      toast({
        title: 'Hata',
        description: `Mesaj düzenlenemedi: ${error.message}`,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mesajı Düzenle</DialogTitle>
          <DialogDescription>
            Mesajınızı güncelleyin...
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Textarea
            {...register('newText')}
            className="min-h-[100px] my-4"
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kaydet
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
