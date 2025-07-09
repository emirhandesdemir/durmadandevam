// src/components/admin/ManageDiamondsDialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gem } from "lucide-react";
import type { UserData } from "@/app/admin/users/page";
import { modifyUserDiamonds } from "@/lib/actions/adminActions";

interface ManageDiamondsDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  user: UserData | null;
}

// Form validasyon şeması.
const formSchema = z.object({
  amount: z.coerce.number().int("Sadece tam sayılar girilebilir."),
});

/**
 * Bir kullanıcının elmas miktarını yönetmek için kullanılan dialog bileşeni.
 * Pozitif sayılar ekler, negatif sayılar çıkarır.
 */
export default function ManageDiamondsDialog({ isOpen, setIsOpen, user }: ManageDiamondsDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  if (!user) return null;

  // Form gönderildiğinde çalışacak fonksiyon.
  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await modifyUserDiamonds(user.uid, data.amount);
      if (result.success) {
        toast({ title: "Başarılı", description: `${user.username} kullanıcısının elmas miktarı güncellendi.` });
        setIsOpen(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elmasları Yönet: {user.username}</DialogTitle>
          <DialogDescription>
            Mevcut Elmas: <span className="font-bold text-foreground">{user.diamonds || 0}</span>. 
            Ekleme yapmak için pozitif, çıkarma yapmak için negatif bir sayı girin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="amount" className="sr-only">Miktar</Label>
            <div className="relative">
              <Input id="amount" type="number" {...register("amount")} placeholder="örn: 100 veya -50" />
              <Gem className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Güncelle
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
