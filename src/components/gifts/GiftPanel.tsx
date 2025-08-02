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
  const canAfford = selectedGift ? (userData?.diamonds || 0) >= selectedGift.diamondCost : false;

  const handleSendGift = async () => {
    if (!user || !userData || !selectedGift) return;
    
    if (!canAfford) {
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
      <SheetContent side="bottom" className="h-[75dvh] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Hediye Gönder</SheetTitle>
          <SheetDescription>
            Elmas bakiyen: <strong className="text-foreground">{userData?.diamonds || 0}</strong>
          </SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 space-y-2">
                <p className="text-sm font-medium">Kime Göndereceksin?</p>
                <ScrollArea className="w-full whitespace-nowrap -mx-4 px-4">
                    <div className="flex gap-3 pb-2">
                        <button onClick={() => setSelectedReceiverId(null)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border-2", !selectedReceiverId ? "border-primary bg-primary/10" : "border-transparent bg-muted/50")}>
                            <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center text-primary font-bold">Oda</div>
                            <span className="text-xs font-semibold">Odaya</span>
                        </button>
                        {room.participants.filter(p => p.uid !== user?.uid).map(p => (
                            <button key={p.uid} onClick={() => setSelectedReceiverId(p.uid)} className={cn("flex flex-col items-center gap-1 p-2 rounded-lg border-2", selectedReceiverId === p.uid ? "border-primary bg-primary/10" : "border-transparent bg-muted/50")}>
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
        
           <ScrollArea className="flex-1 px-4">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 py-4">
                    {giftList.map(gift => {
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
        
        <SheetFooter className="p-4 mt-auto border-t bg-background">
          <Button onClick={handleSendGift} disabled={!selectedGift || isSending || !canAfford} className="w-full">
            {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {selectedGift ? canAfford ? `${selectedGift.diamondCost} Elmasa Gönder` : 'Yetersiz Bakiye' : 'Hediye Seç'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
