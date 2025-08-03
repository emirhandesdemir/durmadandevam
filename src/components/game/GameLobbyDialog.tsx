// src/components/game/GameLobbyDialog.tsx
'use client';

// Bu bileşen, oda sahibinin oyun başlatmadan önce oyun türünü ve
// oyuncuları seçtiği lobi arayüzünü sağlar.

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startGameInRoom } from '@/lib/actions/gameActions';
import type { Room } from '@/lib/types';
import { Puzzle, Loader2 } from 'lucide-react';

// Quiz oyunu kaldırıldı, bu component şimdilik boş.
const gameOptions: any[] = [
  // { id: 'quiz', name: 'Quiz Oyunu', icon: Puzzle, minPlayers: 1 },
];

interface GameLobbyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  participants: Room['participants'];
}

export default function GameLobbyDialog({ isOpen, onOpenChange, roomId, participants }: GameLobbyDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartGame = async () => {
    if (!user || !selectedGameId || !roomId) return;

    setIsSubmitting(true);
    try {
        if (selectedGameId === 'quiz') {
            await startGameInRoom(roomId);
            toast({ title: "Oyun Geri Sayımı Başladı!", description: `Quiz 1 dakika içinde başlayacak.` });
        }
        
        resetAndClose();
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message || "Oyun başlatılamadı." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Oyun Başlat</DialogTitle>
          <DialogDescription>
            Oynamak istediğiniz oyunu seçin.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex-1">
            {gameOptions.length > 0 ? (
                 <RadioGroup value={selectedGameId || ''} onValueChange={(v) => setSelectedGameId(v)}>
                    <div className="space-y-2">
                        {gameOptions.map(game => (
                        <Label key={game.id} htmlFor={game.id} className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                            <game.icon className="h-6 w-6 text-primary" />
                            <div className="flex-1">
                            <p className="font-semibold">{game.name}</p>
                            </div>
                            <RadioGroupItem value={game.id} id={game.id} />
                        </Label>
                        ))}
                    </div>
                    </RadioGroup>
            ) : (
                <p className="text-center text-sm text-muted-foreground">Şu anda mevcut oyun yok.</p>
            )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={resetAndClose}>
            İptal
          </Button>
          <Button onClick={handleStartGame} disabled={isSubmitting || !selectedGameId}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Başlat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
