// src/components/common/ReportDialog.tsx
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
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
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';

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
  const form = useForm<ReportFormValues>({
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
        form.reset();
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
            form.reset();
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <Label>Şikayet Sebebi</Label>
                  <Select onValueChange={field.onChange} defaultValue={field.value} disabled={form.formState.isSubmitting}>
                    <FormControl>
                        <SelectTrigger id="reason">
                            <SelectValue placeholder="Bir sebep seçin..." />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reasonOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                          </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                    <Label htmlFor="details">Ek Detaylar (İsteğe Bağlı)</Label>
                    <FormControl>
                        <Textarea
                        id="details"
                        placeholder="Şikayetinizle ilgili daha fazla bilgi verin..."
                        className="min-h-[100px]"
                        disabled={form.formState.isSubmitting}
                        {...field}
                        />
                    </FormControl>
                    <FormMessage />
                </FormItem>
              )}
             />
            <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
                İptal
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şikayet Et
                </Button>
            </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
