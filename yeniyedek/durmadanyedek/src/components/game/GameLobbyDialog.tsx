// src/components/game/GameLobbyDialog.tsx
'use client';

// Bu bileşen, oda sahibinin oyun başlatmadan önce oyun türünü ve
// oyuncuları seçtiği lobi arayüzünü sağlar.

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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { initiateGameInvite } from '@/lib/actions/gameActions';
import { startMindWar } from '@/lib/actions/mindWarActions'; // Zihin Savaşları eylemini import et
import type { Room, UserProfile } from '@/lib/types';
import { Dice6, Hand, Bot as BottleIcon, BrainCircuit, Loader2, Users } from 'lucide-react'; // İkonları import et
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Textarea } from '../ui/textarea';

// Oynanabilecek oyunların listesi
const gameOptions = [
  { id: 'dice', name: 'Zar Oyunu', icon: Dice6, minPlayers: 2, maxPlayers: 2, needsTheme: false },
  { id: 'rps', name: 'Taş-Kağıt-Makas', icon: Hand, minPlayers: 2, maxPlayers: 2, needsTheme: false },
  { id: 'bottle', name: 'Şişe Çevirmece', icon: BottleIcon, minPlayers: 2, maxPlayers: 2, needsTheme: false },
  { id: 'mind-wars', name: 'Zihin Savaşları', icon: BrainCircuit, minPlayers: 2, maxPlayers: 5, needsTheme: true },
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
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [theme, setTheme] = useState(''); // Zihin Savaşları için tema
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Seçilen oyuna göre yapılandırmayı bul
  const gameConfig = useMemo(() => gameOptions.find(g => g.id === selectedGameId), [selectedGameId]);

  // Bir sonraki adıma geç
  const handleNextStep = () => {
    if (step === 1 && selectedGameId) {
      setStep(2);
    }
  };

  // Oyuncu seçme/seçimi kaldırma
  const handlePlayerSelect = (playerId: string) => {
    if (!gameConfig) return;
    const maxPlayers = gameConfig.maxPlayers;
    
    setSelectedPlayers(prev => {
        const isSelected = prev.includes(playerId);
        if (isSelected) {
            return prev.filter(id => id !== playerId);
        }
        if (prev.length < maxPlayers - 1) { // Host zaten 1 oyuncu
            return [...prev, playerId];
        }
        toast({
            variant: "destructive",
            description: `Bu oyun için en fazla ${maxPlayers - 1} rakip seçebilirsiniz.`
        });
        return prev;
    });
  };
  
  // Oyunu başlatma veya davet gönderme
  const handleStartGame = async () => {
    if (!user || !userData || !gameConfig || !roomId) return;

    // Oyuncu sayısı kontrolü
    const requiredPlayers = gameConfig.minPlayers - 1;
    if (selectedPlayers.length < requiredPlayers) {
        toast({ variant: 'destructive', description: `Bu oyun için en az ${requiredPlayers} rakip seçmelisiniz.` });
        return;
    }
    
    // Zihin Savaşları için tema kontrolü
    if (gameConfig.needsTheme && !theme.trim()) {
        toast({ variant: 'destructive', description: 'Lütfen oyun için bir tema veya senaryo girin.' });
        return;
    }

    setIsSubmitting(true);
    try {
        const fullPlayerDetails = [user, ...participants.filter(p => selectedPlayers.includes(p.uid))]
            .map(p => ({ uid: p.uid, username: p.username, photoURL: p.photoURL || null }));

        if (gameConfig.id === 'mind-wars') {
             // Zihin Savaşları oyununu başlat
            await startMindWar({
                roomId,
                hostId: user.uid,
                playerUids: [user.uid, ...selectedPlayers],
                theme,
            });
            toast({ title: "Oyun Başlıyor...", description: "Zihin Savaşları oturumu oluşturuluyor." });
        } else {
             // Diğer oyunlar için davet gönder
            await initiateGameInvite(
                roomId,
                { uid: user.uid, username: userData.username, photoURL: userData.photoURL || null },
                gameConfig.id,
                gameConfig.name,
                participants.filter(p => selectedPlayers.includes(p.uid))
            );
            toast({ title: "Davetler Gönderildi", description: `Oyuncuların kabul etmesi bekleniyor.` });
        }
        
        resetAndClose();
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message || "Oyun başlatılamadı." });
    } finally {
        setIsSubmitting(false);
    }
  };

  // Dialog kapatıldığında state'i sıfırla
  const resetAndClose = () => {
    setStep(1);
    setSelectedGameId(null);
    setSelectedPlayers([]);
    setTheme('');
    onOpenChange(false);
  };

  // Kendisi dışındaki katılımcıları listele
  const otherParticipants = participants.filter(p => p.uid !== user?.uid);
  
  // Seçimlerin geçerli olup olmadığını kontrol et
  const isSelectionInvalid = useMemo(() => {
    if (!gameConfig) return true;
    const requiredPlayers = gameConfig.minPlayers - 1;
    return selectedPlayers.length < requiredPlayers;
  }, [selectedPlayers, gameConfig]);

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-md h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Oyun Başlat</DialogTitle>
          <DialogDescription>
            {step === 1 ? "Oynamak istediğiniz oyunu seçin." : "Rakip veya rakiplerinizi seçin."}
          </DialogDescription>
        </DialogHeader>

        {/* Adım 1: Oyun Seçimi */}
        {step === 1 && (
          <div className="py-4 flex-1">
            <RadioGroup value={selectedGameId || ''} onValueChange={(v) => setSelectedGameId(v)}>
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

        {/* Adım 2: Oyuncu ve Tema Seçimi */}
        {step === 2 && gameConfig && (
            <div className="py-4 flex flex-col flex-1 overflow-hidden gap-4">
                 <div>
                    <Label className="text-sm font-medium">Rakip Seç ({selectedPlayers.length}/{gameConfig.maxPlayers - 1})</Label>
                    <ScrollArea className="h-48 border rounded-lg mt-1">
                        <div className="p-2 space-y-1">
                            {otherParticipants.length > 0 ? otherParticipants.map(p => (
                                <div key={p.uid} onClick={() => handlePlayerSelect(p.uid)} className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer">
                                    <Checkbox checked={selectedPlayers.includes(p.uid)} id={`player-check-${p.uid}`} />
                                    <Avatar className="h-9 w-9"><AvatarImage src={p.photoURL || undefined} /><AvatarFallback>{p.username.charAt(0)}</AvatarFallback></Avatar>
                                    <span className="flex-1 font-medium">{p.username}</span>
                                </div>
                            )) : <p className="text-center text-muted-foreground p-4">Odada başka oyuncu yok.</p>}
                        </div>
                    </ScrollArea>
                    <p className="text-xs text-muted-foreground mt-1">Bu oyun için {gameConfig.minPlayers - 1}-{gameConfig.maxPlayers - 1} rakip seçmelisiniz.</p>
                 </div>
                 {gameConfig.needsTheme && (
                     <div>
                        <Label htmlFor="theme" className="font-semibold">Oyun Teması</Label>
                        <Textarea id="theme" value={theme} onChange={(e) => setTheme(e.target.value)} placeholder="Örn: Terk edilmiş bir uzay istasyonunda mahsur kaldınız..." className="mt-1" />
                    </div>
                 )}
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={step === 1 ? resetAndClose : () => setStep(1)}>
            {step === 1 ? "İptal" : "Geri"}
          </Button>
          {step === 1 ? (
             <Button onClick={handleNextStep} disabled={!selectedGameId}>İleri</Button>
          ) : (
            <Button onClick={handleStartGame} disabled={isSubmitting || isSelectionInvalid}>
               {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Başlat
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
