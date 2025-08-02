// src/components/rooms/OpenPortalDialog.tsx
'use client';

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
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { openPortalForRoom } from "@/lib/actions/roomActions";
import { Gem, Loader2, Zap } from "lucide-react";
import { useState } from "react";

interface OpenPortalDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
}

export default function OpenPortalDialog({ isOpen, onOpenChange, roomId, roomName }: OpenPortalDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenPortal = async () => {
    if (!user) return;
    setIsSubmitting(true);
    try {
        const result = await openPortalForRoom(roomId, user.uid);
        if (result.success) {
            toast({
                title: 'Portal Açıldı!',
                description: `"${roomName}" odası 5 dakika boyunca tüm odalarda duyurulacak.`,
            });
            onOpenChange(false);
        } else {
             throw new Error(result.error);
        }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Hata",
        description: error.message || "Portal açılırken bir sorun oluştu.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Odaya Portal Aç
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem, odanızı 5 dakika boyunca diğer tüm aktif odalarda öne çıkarır ve duyurur. Kullanıcılar tek tıkla odanıza katılabilir.
            <br/><br/>
            Maliyet: <strong className="text-foreground flex items-center gap-1">100 <Gem className="h-4 w-4 text-cyan-400" /></strong>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>İptal</AlertDialogCancel>
          <AlertDialogAction onClick={handleOpenPortal} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Portalı Aç
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
