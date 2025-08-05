// src/components/rooms/EventWelcomeDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Gift, MicOff, Users } from 'lucide-react';
import type { Room } from '@/lib/types';

interface EventWelcomeDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
}

export default function EventWelcomeDialog({ isOpen, onOpenChange, room }: EventWelcomeDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader className="text-center items-center">
            <div className="p-4 rounded-full bg-yellow-400/20 mb-4">
                 <Gift className="h-12 w-12 text-yellow-500" />
            </div>
          <DialogTitle className="text-2xl font-bold">Etkinlik Odasına Hoş Geldiniz!</DialogTitle>
          <DialogDescription>
            "{room.name}" adlı özel etkinliğe katıldınız.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                <MicOff className="h-6 w-6 text-destructive mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Sadece Yöneticiler Konuşabilir</h4>
                    <p className="text-sm text-muted-foreground">Bu bir etkinlik odası olduğu için, sadece oda sahibi ve yöneticiler sesli sohbete katılabilir.</p>
                </div>
            </div>
            <div className="flex items-start gap-4 p-3 bg-muted rounded-lg">
                <Users className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Sohbetin Tadını Çıkarın</h4>
                    <p className="text-sm text-muted-foreground">Konuşmaları dinleyebilir, yazılı sohbete katılabilir ve diğer katılımcılarla etkileşimde bulunabilirsiniz.</p>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => onOpenChange(false)}>Anladım, İyi Eğlenceler!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
