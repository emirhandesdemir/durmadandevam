// src/components/common/ReportDialog.tsx
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { submitReport } from '@/lib/actions/userActions';
import { Loader2 } from 'lucide-react';

type Target = {
  type: 'user';
  id: string;
  name: string;
} | {
  type: 'post';
  id: string;
  user: {
    id: string;
    name: string;
  };
};

interface ReportDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  target: Target;
}

const reportSchema = z.object({
  reason: z.string().min(1, 'Lütfen bir sebep seçin.'),
  details: z.string().max(500, 'Detaylar en fazla 500 karakter olabilir.'),
});

type ReportFormValues = z.infer<typeof reportSchema>;

const reasonOptions = [
    { value: 'spam', label: 'Spam veya yanıltıcı' },
    { value: 'harassment', label: 'Taciz veya zorbalık' },
    { value: 'hate_speech', label: 'Nefret söylemi' },
    { value: 'inappropriate_content', label: 'Uygunsuz içerik' },
    { value: 'impersonation', label: 'Taklitçilik' },
    { value: 'other', label: 'Diğer' },
];

export default function ReportDialog({ isOpen, onOpenChange, target }: ReportDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, control, reset } = useForm<ReportFormValues>({
    resolver: zodResolver(reportSchema),
  });

  const onSubmit: SubmitHandler<ReportFormValues> = async (data) => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız.' });
      return;
    }
    
    try {
        const reportedUserId = target.type === 'user' ? target.id : target.user.id;
        const reportedUsername = target.type === 'user' ? target.name : target.user.name;

        await submitReport({
            reporterId: user.uid,
            reporterUsername: userData.username,
            reportedUserId: reportedUserId,
            reportedUsername: reportedUsername,
            reason: data.reason,
            details: data.details,
            targetId: target.id,
            targetType: target.type
        });

        toast({
            title: 'Şikayetiniz Alındı',
            description: 'İlgili birime iletildi. Teşekkür ederiz.',
        });
        reset();
        onOpenChange(false);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.message || 'Şikayet gönderilirken bir sorun oluştu.',
      });
    }
  };

  const targetName = target.type === 'user' ? target.name : `${target.user.name}'in gönderisi`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
        if (!open) {
            reset();
            onOpenChange(false);
        }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>"{targetName}" için şikayet et</DialogTitle>
          <DialogDescription>
            Lütfen şikayet sebebini belirtin. Ekibimiz en kısa sürede inceleyecektir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="reason">Şikayet Sebebi</Label>
            <Select onValueChange={(value) => control._fields.reason?._f.onChange(value)} disabled={isSubmitting}>
              <SelectTrigger id="reason">
                <SelectValue placeholder="Bir sebep seçin..." />
              </SelectTrigger>
              <SelectContent>
                {reasonOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                    </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-sm text-destructive mt-1">{errors.reason.message}</p>}
          </div>
          <div>
            <Label htmlFor="details">Ek Detaylar (İsteğe Bağlı)</Label>
            <Textarea
              id="details"
              {...register('details')}
              placeholder="Şikayetinizle ilgili daha fazla bilgi verin..."
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
             {errors.details && <p className="text-sm text-destructive mt-1">{errors.details.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Şikayet Et
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
