// src/components/gifts/GiftPanel.tsx
'use client';

import { useState } from 'react';
import { giftList } from '@/lib/gifts';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sendGift } from '@/lib/actions/giftActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Gem, Loader2, Send } from 'lucide-react';
import type { Room } from '@/lib/types';
import { cn } from '@/lib/utils';

interface GiftPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
}

export default function GiftPanel({ isOpen, onOpenChange, room }: GiftPanelProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
  const [selectedReceiverId, setSelectedReceiverId] = useState<string | null>(null); // null for room
  const [isSending, setIsSending] = useState(false);
  
  const selectedGift = giftList.find(g => g.id === selectedGiftId);

  const handleSendGift = async () => {
    if (!user || !userData || !selectedGift) return;
    
    if ((userData.diamonds || 0) < selectedGift.diamondCost) {
        toast({ variant: 'destructive', description: "Yetersiz elmas bakiyesi." });
        return;
    }

    setIsSending(true);
    try {
        await sendGift({
            roomId: room.id,
            senderId: user.uid,
            senderName: userData.username,
            receiverId: selectedReceiverId,
            giftId: selectedGift.id,
        });
        toast({ description: 'Hediye başarıyla gönderildi!' });
        onOpenChange(false);
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    } finally {
        setIsSending(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75dvh] flex flex-col">
        <SheetHeader>
          <SheetTitle>Hediye Gönder</SheetTitle>
          <SheetDescription>
            Elmas bakiyen: <strong className="text-foreground">{userData?.diamonds || 0}</strong>
          </SheetDescription>
        </SheetHeader>
        
        <div className="py-2">
            <p className="text-sm font-medium mb-2">Kime Göndereceksin?</p>
            <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-3 pb-2">
                    <button onClick={() => setSelectedReceiverId(null)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border-2", !selectedReceiverId ? "border-primary bg-primary/10" : "border-transparent")}>
                        <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center text-primary font-bold">Oda</div>
                        <span className="text-xs font-semibold">Odaya</span>
                    </button>
                    {room.participants.filter(p => p.uid !== user?.uid).map(p => (
                        <button key={p.uid} onClick={() => setSelectedReceiverId(p.uid)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border-2", selectedReceiverId === p.uid ? "border-primary bg-primary/10" : "border-transparent")}>
                            <Avatar className="h-14 w-14">
                                <AvatarImage src={p.photoURL || undefined} />
                                <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs font-semibold truncate max-w-[60px]">{p.username}</span>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
        
        <div className="py-2 flex-1 flex flex-col">
           <p className="text-sm font-medium mb-2">Ne Göndereceksin?</p>
           <ScrollArea className="flex-1 -mx-6 px-6">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {giftList.map(gift => {
                        // CRITICAL FIX: Ensure the icon component exists before rendering
                        if (!gift.icon) return null;
                        const GiftIcon = gift.icon;
                        return (
                            <button key={gift.id} onClick={() => setSelectedGiftId(gift.id)} className={cn("flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all", selectedGiftId === gift.id ? "border-primary bg-primary/10 scale-105" : "bg-muted/50")}>
                                <GiftIcon className="h-10 w-10 text-primary" />
                                <p className="text-sm font-semibold">{gift.name}</p>
                                <div className="flex items-center gap-1 text-xs font-bold text-cyan-500">
                                    <Gem className="h-3 w-3" />
                                    {gift.diamondCost}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
        
        <SheetFooter className="mt-auto pt-4 border-t">
          <Button onClick={handleSendGift} disabled={!selectedGift || isSending} className="w-full">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {selectedGift ? `${selectedGift.diamondCost} Elmasa Gönder` : 'Hediye Seç'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
