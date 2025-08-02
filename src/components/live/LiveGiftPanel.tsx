// src/components/live/LiveGiftPanel.tsx
'use client';

import { useState } from 'react';
import { giftList } from '@/lib/gifts';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { sendLiveGift } from '@/lib/actions/liveActions';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Gem, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LiveGiftPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  liveId: string;
  hostId: string;
}

export default function LiveGiftPanel({ isOpen, onOpenChange, liveId, hostId }: LiveGiftPanelProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [selectedGiftId, setSelectedGiftId] = useState<string | null>(null);
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
        await sendLiveGift(liveId, user.uid, userData.username, selectedGift.id);
        toast({ description: 'Hediye başarıyla gönderildi!' });
        onOpenChange(false);
        setSelectedGiftId(null);
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    } finally {
        setIsSending(false);
    }
  };
  
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[50dvh] flex flex-col p-0">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Hediye Gönder</SheetTitle>
          <SheetDescription>
            Elmas bakiyen: <strong className="text-foreground">{userData?.diamonds || 0}</strong>
          </SheetDescription>
        </SheetHeader>
        
        <ScrollArea className="flex-1 px-4">
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-4 py-4">
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
