// src/components/game/GameLobbyDialog.tsx
'use client';

import { useState, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { initiateGameInvite } from '@/lib/actions/gameActions';
import type { Room } from '@/lib/types';
import { Dice6, Hand, Bot, Loader2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';

type GameType = 'dice' | 'rps' | 'bottle';

const gameOptions: { id: GameType, name: string, icon: React.ElementType, minPlayers: number, maxPlayers: number }[] = [
  { id: 'dice', name: 'Zar Oyunu', icon: Dice6, minPlayers: 2, maxPlayers: 8 },
  { id: 'rps', name: 'Taş-Kağıt-Makas', icon: Hand, minPlayers: 2, maxPlayers: 2 },
  { id: 'bottle', name: 'Şişe Çevirmece', icon: Bot, minPlayers: 2, maxPlayers: 2 },
];

interface GameLobbyDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  participants: Room['participants'];
}

export default function GameLobbyDialog({ isOpen, onOpenChange, roomId, participants }: GameLobbyDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gameConfig = useMemo(() => gameOptions.find(g => g.id === selectedGame), [selectedGame]);

  const handleNextStep = () => {
    if (step === 1 && selectedGame) {
      setStep(2);
    }
  };

  const handlePlayerSelect = (playerId: string, isSingleSelect: boolean) => {
    if (isSingleSelect) {
      setSelectedPlayers([playerId]);
    } else {
      setSelectedPlayers(prev =>
        prev.includes(playerId)
          ? prev.filter(id => id !== playerId)
          : [...prev, playerId]
      );
    }
  };
  
  const handleStartGame = async () => {
    if (!user || !userData || !gameConfig || !roomId) return;
    
    const totalPlayersIncludingHost = selectedPlayers.length + 1;
    if (totalPlayersIncludingHost < gameConfig.minPlayers || totalPlayersIncludingHost > gameConfig.maxPlayers) {
        toast({ 
            variant: 'destructive', 
            description: `Bu oyun için ${gameConfig.minPlayers} ila ${gameConfig.maxPlayers} arasında oyuncu gerekir. (Siz dahil ${totalPlayersIncludingHost} kişi seçtiniz)` 
        });
        return;
    }

    setIsSubmitting(true);
    try {
        const invitedPlayerDetails = participants.filter(p => selectedPlayers.includes(p.uid))
            .map(p => ({ uid: p.uid, username: p.username }));

        await initiateGameInvite(
            roomId,
            { uid: user.uid, username: userData.username },
            gameConfig.id,
            gameConfig.name,
            invitedPlayerDetails
        );
        
        toast({ title: "Davetler Gönderildi", description: `Oyuncuların kabul etmesi bekleniyor.` });
        resetAndClose();

    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message || "Oyun daveti gönderilemedi." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setStep(1);
    setSelectedGame(null);
    setSelectedPlayers([]);
    onOpenChange(false);
  };

  const otherParticipants = participants.filter(p => p.uid !== user?.uid);
  
  const isSelectionInvalid = useMemo(() => {
    if (!gameConfig) return true;
    const totalPlayers = selectedPlayers.length + 1;
    return totalPlayers < gameConfig.minPlayers || totalPlayers > gameConfig.maxPlayers;
  }, [selectedPlayers, gameConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Oyun Başlat</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Oynamak istediğiniz oyunu seçin." : "Oyuna katılacak kişileri seçin."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="py-4 flex-1">
            <RadioGroup value={selectedGame || ''} onValueChange={(v) => setSelectedGame(v as GameType)}>
              <div className="space-y-2">
                {gameOptions.map(game => (
                  <Label key={game.id} htmlFor={game.id} className="flex items-center gap-4 rounded-lg border p-3 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                    <game.icon className="h-6 w-6 text-primary" />
                    <div className="flex-1">
                      <p className="font-semibold">{game.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> {game.minPlayers}-{game.maxPlayers} oyuncu</p>
                    </div>
                    <RadioGroupItem value={game.id} id={game.id} />
                  </Label>
                ))}
              </div>
            </RadioGroup>
          </div>
        )}

        {step === 2 && gameConfig && (
            <div className="py-4 flex flex-col flex-1 overflow-hidden">
                {gameConfig.id === 'bottle' ? (
                     <>
                        <p className="text-sm font-medium mb-2">Oyuncu Seç (1 kişi)</p>
                        <RadioGroup onValueChange={(playerId) => handlePlayerSelect(playerId, true)} value={selectedPlayers[0] || ''}>
                            <ScrollArea className="flex-1 border rounded-lg">
                                <div className="p-2 space-y-1">
                                    {otherParticipants.length > 0 ? otherParticipants.map(p => (
                                        <Label key={p.uid} htmlFor={p.uid} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer has-[:checked]:bg-accent">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={p.photoURL || undefined} />
                                                <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <span className="flex-1 font-medium">{p.username}</span>
                                            <RadioGroupItem value={p.uid} id={p.uid} />
                                        </Label>
                                    )) : <p className="text-center text-muted-foreground p-4">Odada başka oyuncu yok.</p>}
                                </div>
                            </ScrollArea>
                        </RadioGroup>
                        <p className="text-xs text-muted-foreground mt-2">Şişe çevirmece için 1 oyuncu seçin.</p>
                    </>
                ) : (
                    <>
                        <p className="text-sm font-medium mb-2">Oyuncular ({selectedPlayers.length} / {gameConfig.maxPlayers - 1})</p>
                        <ScrollArea className="flex-1 border rounded-lg">
                            <div className="p-2 space-y-1">
                                {otherParticipants.length > 0 ? otherParticipants.map(p => (
                                    <div key={p.uid} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent">
                                        <Avatar className="h-9 w-9">
                                            <AvatarImage src={p.photoURL || undefined} />
                                            <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <Label htmlFor={p.uid} className="flex-1 font-medium cursor-pointer">{p.username}</Label>
                                        <Checkbox 
                                            id={p.uid} 
                                            checked={selectedPlayers.includes(p.uid)} 
                                            onCheckedChange={() => handlePlayerSelect(p.uid, false)}
                                            disabled={selectedPlayers.length >= (gameConfig.maxPlayers - 1) && !selectedPlayers.includes(p.uid)}
                                        />
                                    </div>
                                )) : <p className="text-center text-muted-foreground p-4">Odada başka oyuncu yok.</p>}
                            </div>
                        </ScrollArea>
                        <p className="text-xs text-muted-foreground mt-2">Bu oyun için siz hariç en az {gameConfig.minPlayers - 1}, en fazla {gameConfig.maxPlayers - 1} oyuncu seçebilirsiniz.</p>
                    </>
                )}
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={step === 1 ? resetAndClose : () => setStep(1)}>
            {step === 1 ? "İptal" : "Geri"}
          </Button>
          {step === 1 ? (
             <Button onClick={handleNextStep} disabled={!selectedGame}>İleri</Button>
          ) : (
            <Button onClick={handleStartGame} disabled={isSubmitting || isSelectionInvalid}>
               {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Davet Gönder
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
