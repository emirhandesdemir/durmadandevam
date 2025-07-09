// src/components/admin/ManagePremiumDialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Crown } from "lucide-react";
import type { UserData } from "@/app/admin/users/page";
import { manageUserPremium } from "@/lib/actions/adminActions";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Label } from "../ui/label";

interface ManagePremiumDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: UserData | null;
}

const durationOptions = [
    { label: "7 Gün", value: 7 },
    { label: "30 Gün", value: 30 },
    { label: "90 Gün", value: 90 },
];

export default function ManagePremiumDialog({ isOpen, setIsOpen, user }: ManagePremiumDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<number>(7);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);

  if (!user) return null;

  const isPremium = user.premiumUntil && user.premiumUntil.toDate() > new Date();

  const handleGrantPremium = async () => {
    setIsSubmitting(true);
    try {
      const result = await manageUserPremium(user.uid, selectedDuration);
      if (result.success) {
        toast({ title: "Başarılı", description: `${user.username} kullanıcısına ${selectedDuration} gün premium verildi.` });
        setIsOpen(false);
      } else {
        throw new Error("İşlem sırasında bir hata oluştu.");
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokePremium = async () => {
    setShowRevokeConfirm(false);
    setIsSubmitting(true);
    try {
        await manageUserPremium(user.uid, null);
        toast({ title: "Başarılı", description: `${user.username} kullanıcısının premium üyeliği iptal edildi.` });
        setIsOpen(false);
    } catch (error: any) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Premium Yönet: {user.username}</DialogTitle>
             <DialogDescription>
                {isPremium 
                ? `Üyelik Bitiş Tarihi: ${format(user.premiumUntil!.toDate(), 'PPpp', { locale: tr })}`
                : "Kullanıcı şu anda premium değil."
                }
            </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
                <Label>Süre Seçin</Label>
                <RadioGroup value={String(selectedDuration)} onValueChange={(val) => setSelectedDuration(Number(val))}>
                    {durationOptions.map(opt => (
                        <div key={opt.value} className="flex items-center space-x-2">
                             <RadioGroupItem value={String(opt.value)} id={`d-${opt.value}`} />
                             <Label htmlFor={`d-${opt.value}`}>{opt.label}</Label>
                        </div>
                    ))}
                </RadioGroup>
            </div>
            <DialogFooter className="sm:justify-between">
                {isPremium && (
                     <Button type="button" variant="destructive" onClick={() => setShowRevokeConfirm(true)} disabled={isSubmitting}>
                        Premium'u İptal Et
                    </Button>
                )}
                <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Kapat
                    </Button>
                    <Button type="button" onClick={handleGrantPremium} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Onayla ve Ver
                    </Button>
                </div>
            </DialogFooter>
        </DialogContent>
        </Dialog>
        <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Premium Üyeliği İptal Et?</AlertDialogTitle>
                    <AlertDialogDescription>
                        {user.username} kullanıcısının premium üyeliğini iptal etmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>İptal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleRevokePremium} className="bg-destructive hover:bg-destructive/90">
                        Evet, İptal Et
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </>
  );
}
