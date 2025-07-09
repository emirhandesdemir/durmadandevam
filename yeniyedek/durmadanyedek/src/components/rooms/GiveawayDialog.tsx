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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Gift, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { startGiveaway } from '@/lib/actions/giveawayActions';

interface GiveawayDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  roomId: string;
  isHost: boolean;
}

export default function GiveawayDialog({ isOpen, setIsOpen, roomId, isHost }: GiveawayDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [prize, setPrize] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (!user || !isHost || !prize.trim()) return;
    setIsStarting(true);
    try {
      await startGiveaway(roomId, user.uid, prize);
      toast({ title: 'Çekiliş Başlatıldı!', description: 'Katılımcılar artık çekilişe katılabilir.' });
      setIsOpen(false);
      setPrize('');
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            Çekiliş Başlat
          </DialogTitle>
          <DialogDescription>
            Bir ödül belirleyerek odadaki herkes için bir çekiliş başlat.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="prize">Ödül</Label>
          <Input 
            id="prize" 
            placeholder="örn: 100 Elmas, 1 Haftalık Premium..." 
            value={prize}
            onChange={(e) => setPrize(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>İptal</Button>
          <Button onClick={handleStart} disabled={isStarting || !prize.trim()}>
            {isStarting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Çekilişi Başlat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
