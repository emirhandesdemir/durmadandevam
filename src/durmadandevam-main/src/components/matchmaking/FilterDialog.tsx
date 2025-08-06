// src/components/matchmaking/FilterDialog.tsx
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Gem } from 'lucide-react';

export interface AppliedFilters {
  gender: 'male' | 'female' | 'any';
  ageRange: [number, number];
  city: string;
}

interface FilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentFilters: AppliedFilters | null;
  onApplyFilters: (filters: AppliedFilters | null) => void;
}

const filterSchema = z.object({
  gender: z.enum(['male', 'female', 'any']).default('any'),
  city: z.string().optional(),
  minAge: z.preprocess(
    (val) => val === '' || val === null ? undefined : Number(val),
    z.number().min(18, 'Yaş en az 18 olmalıdır.').optional()
  ),
  maxAge: z.preprocess(
    (val) => val === '' || val === null ? undefined : Number(val),
    z.number().max(99, 'Yaş en fazla 99 olabilir.').optional()
  ),
}).refine(data => !data.minAge || !data.maxAge || data.maxAge >= data.minAge, {
    message: "Maksimum yaş minimum yaştan küçük olamaz.",
    path: ["maxAge"],
});

type FilterFormValues = z.infer<typeof filterSchema>;

export default function FilterDialog({ isOpen, onOpenChange, currentFilters, onApplyFilters }: FilterDialogProps) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FilterFormValues>({
    resolver: zodResolver(filterSchema),
    defaultValues: {
        gender: currentFilters?.gender || 'any',
        city: currentFilters?.city || '',
        minAge: currentFilters?.ageRange[0] || undefined,
        maxAge: currentFilters?.ageRange[1] || undefined,
    },
  });

  const onSubmit: SubmitHandler<FilterFormValues> = (data) => {
    onApplyFilters({
      gender: data.gender,
      city: data.city || '',
      ageRange: [data.minAge || 18, data.maxAge || 99],
    });
    onOpenChange(false);
  };

  const handleClearFilters = () => {
    onApplyFilters(null);
    reset({ gender: 'any', city: '', minAge: undefined, maxAge: undefined });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Eşleşme Filtreleri</DialogTitle>
          <DialogDescription>
            Aramanı belirli kriterlere göre özelleştir. Bu işlem ücretsizdir.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
                <Label>Cinsiyet</Label>
                <RadioGroup {...register('gender')} defaultValue={currentFilters?.gender || 'any'} className="flex space-x-4 pt-2">
                     <div className="flex items-center space-x-2"><RadioGroupItem value="any" id="any" /><Label htmlFor="any">Farketmez</Label></div>
                     <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Erkek</Label></div>
                     <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Kadın</Label></div>
                </RadioGroup>
            </div>
             <div>
                <Label>Şehir</Label>
                <Input {...register('city')} placeholder="örn: Ankara" />
            </div>
            <div>
                <Label>Yaş Aralığı</Label>
                <div className="flex items-center gap-2">
                    <Input {...register('minAge')} type="number" placeholder="Min" />
                    <span>-</span>
                    <Input {...register('maxAge')} type="number" placeholder="Max" />
                </div>
                 {errors.maxAge && <p className="text-sm text-destructive mt-1">{errors.maxAge.message}</p>}
            </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClearFilters}>Filtreleri Temizle</Button>
            <Button type="submit">Filtreleri Uygula</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
