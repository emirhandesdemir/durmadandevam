// src/components/matchmaking/MatchmakingFilterDialog.tsx
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Gem, Loader2 } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { updateMatchmakingFilter } from '@/lib/actions/matchmakingActions';

interface MatchmakingFilterDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserData: UserProfile;
}

const filterOptions = [
  { id: 'general', label: 'Genel Sohbet' },
  { id: 'tech', label: 'Teknoloji' },
  { id: 'art', label: 'Sanat & Tasarım' },
  { id: 'business', label: 'İş & Girişimcilik' },
  { id: 'science', label: 'Bilim' },
  { id: 'gaming', label: 'Oyun' },
];

export default function MatchmakingFilterDialog({ isOpen, onOpenChange, currentUserData }: MatchmakingFilterDialogProps) {
  const { toast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState(currentUserData.matchmakingFilter || 'general');
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const cost = 5;

  const handleSave = async () => {
    setShowConfirm(false);
    setIsSaving(true);
    try {
      await updateMatchmakingFilter(currentUserData.uid, selectedFilter, cost);
      toast({ description: "Filtre tercihiniz başarıyla güncellendi." });
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelection = (newFilter: string) => {
    setSelectedFilter(newFilter);
    // Don't show confirm if user re-selects their current filter
    if(newFilter !== currentUserData.matchmakingFilter) {
      setShowConfirm(true);
    }
  }

  return (
    <>
        <Dialog open={isOpen && !showConfirm} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Eşleşme Filtresi</DialogTitle>
                    <DialogDescription>
                        Hangi konuda sohbet etmek istersin? Filtre değişikliği 5 elmasa mal olur.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <RadioGroup value={selectedFilter} onValueChange={handleSelection}>
                        {filterOptions.map((option) => (
                             <div key={option.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={option.id} id={option.id} />
                                <Label htmlFor={option.id}>{option.label}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                </div>
                 <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Kapat</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
         <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Filtreyi Değiştir?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Filtreyi "{filterOptions.find(f=>f.id === selectedFilter)?.label}" olarak değiştirmek <strong className="text-foreground flex items-center justify-center gap-1.5">{cost} <Gem className="h-4 w-4 text-cyan-400"/></strong> mal olacaktır. Onaylıyor musunuz?
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isSaving}>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Onayla
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
