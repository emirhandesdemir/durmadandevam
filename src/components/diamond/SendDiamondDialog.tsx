// src/components/diamond/SendDiamondDialog.tsx
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
import type { UserProfile } from "@/lib/types";
import { sendDiamonds } from "@/lib/actions/diamondActions";
import { useAuth } from "@/contexts/AuthContext";

interface SendDiamondDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  recipient: UserProfile;
}

const formSchema = z.object({
  amount: z.coerce.number().int("Sadece tam sayılar girilebilir.").positive("Miktar pozitif olmalıdır."),
});

export default function SendDiamondDialog({ isOpen, onOpenChange, recipient }: SendDiamondDialogProps) {
  const { userData: sender } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  if (!sender || !recipient) return null;

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const result = await sendDiamonds(sender.uid, recipient.uid, data.amount);
      if (result.success) {
        toast({ title: "Başarılı", description: `${recipient.username} kullanıcısına ${data.amount} elmas gönderildi.` });
        reset();
        onOpenChange(false);
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Elmas Gönder: {recipient.username}</DialogTitle>
          <DialogDescription>
            Mevcut Bakiyen: <span className="font-bold text-foreground">{sender.diamonds || 0}</span> elmas. 
            Göndermek istediğiniz miktarı girin.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="amount" className="sr-only">Miktar</Label>
            <div className="relative">
              <Input id="amount" type="number" {...register("amount")} placeholder="örn: 50" />
              <Gem className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              İptal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Gönder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
