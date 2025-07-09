// src/components/games/mindwar/MindWarLobby.tsx
'use client';

// Bu bileşen, oda sahibinin "Zihin Savaşları" oyununu başlatması için
// lobi arayüzünü sağlar. Oyuncu seçimi ve oyun teması buradan ayarlanır.

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BrainCircuit, Loader2 } from 'lucide-react';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { startMindWar } from '@/lib/actions/mindWarActions';

interface MindWarLobbyProps {
  room: Room;
}

const MIN_PLAYERS = 2; // Oyuncu sayısı alt limiti
const MAX_PLAYERS = 5; // Oyuncu sayısı üst limiti

export default function MindWarLobby({ room }: MindWarLobbyProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [theme, setTheme] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isHost = user?.uid === room.createdBy.uid;

  // Oyuncu seçimi yapıldığında çalışır
  const handlePlayerSelect = (playerId: string) => {
    setSelectedPlayers(prev => {
      const isSelected = prev.includes(playerId);
      if (isSelected) {
        return prev.filter(id => id !== playerId);
      } else {
        if ([...prev, user?.uid].length < MAX_PLAYERS) {
          return [...prev, playerId];
        } else {
          toast({
            variant: 'destructive',
            description: `En fazla ${MAX_PLAYERS} oyuncu seçebilirsiniz.`,
          });
          return prev;
        }
      }
    });
  };

  // Oyunu başlatma fonksiyonu
  const handleStartGame = async () => {
    if (!user) return;
    const finalPlayerCount = [...selectedPlayers, user.uid].length;
    
    if (finalPlayerCount < MIN_PLAYERS) {
      toast({
        variant: 'destructive',
        description: `Oyunu başlatmak için en az ${MIN_PLAYERS} oyuncu seçmelisiniz.`,
      });
      return;
    }
    if (!theme.trim()) {
        toast({
            variant: 'destructive',
            description: 'Lütfen oyun için bir tema veya senaryo girin.',
        });
        return;
    }

    setIsLoading(true);
    try {
      // Sunucu eylemini çağırarak oyunu başlat
      await startMindWar({
        roomId: room.id,
        hostId: room.createdBy.uid,
        playerUids: [user.uid, ...selectedPlayers],
        theme: theme,
      });
      // Başarılı olduğunda, Firestore listener'ı arayüzü otomatik olarak güncelleyecektir.
      // Bu yüzden burada ek bir toast göstermeye gerek yok.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Oyun Başlatılamadı',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Eğer kullanıcı oda sahibi değilse, bu bileşeni gösterme
  if (!isHost) {
    return (
        <Card className="bg-muted/50 border-dashed">
            <CardHeader className="text-center">
                <BrainCircuit className="mx-auto h-10 w-10 text-primary" />
                <CardTitle>Oyun Hazırlanıyor</CardTitle>
                <CardDescription>Oda sahibi bir oyun başlatmak üzere. Lütfen bekleyin.</CardDescription>
            </CardHeader>
        </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Zihin Savaşları Lobisi</CardTitle>
        <CardDescription>Oyuncuları seçin ve oyun temasını belirleyerek macerayı başlatın.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="font-semibold">Oyuncuları Seç ({[...selectedPlayers, user?.uid].length}/{MAX_PLAYERS})</Label>
          <p className="text-xs text-muted-foreground mb-2">Bu oyun için {MIN_PLAYERS}-{MAX_PLAYERS} arası oyuncu gereklidir.</p>
          <ScrollArea className="h-48 rounded-md border p-2">
            <div className="space-y-2">
              {/* Host (oda sahibi) her zaman seçili ve değiştirilemez */}
              <div className="flex items-center space-x-3 rounded-md p-2 bg-primary/10">
                  <Checkbox checked={true} disabled />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.photoURL || undefined} />
                    <AvatarFallback>{user?.displayName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label className="font-medium text-sm text-primary">(Siz) {user?.displayName}</label>
              </div>
              {/* Diğer katılımcılar */}
              {room.participants.filter(p => p.uid !== user?.uid).map(p => (
                <div
                  key={p.uid}
                  className="flex items-center space-x-3 rounded-md p-2 hover:bg-accent cursor-pointer"
                  onClick={() => handlePlayerSelect(p.uid)}
                >
                  <Checkbox
                    checked={selectedPlayers.includes(p.uid)}
                    onCheckedChange={() => handlePlayerSelect(p.uid)}
                    id={`player-${p.uid}`}
                  />
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.photoURL || undefined} />
                    <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <label htmlFor={`player-${p.uid}`} className="font-medium text-sm cursor-pointer">{p.username}</label>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div>
          <Label htmlFor="theme" className="font-semibold">Oyun Teması</Label>
          <Textarea
            id="theme"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="Örn: Terk edilmiş bir uzay istasyonunda mahsur kaldınız ve aranızdan biri hain. Veya: Gizemli bir adada define avına çıkan bir grup maceraperestsiniz."
            className="mt-1"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleStartGame} disabled={isLoading} className="w-full">
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <BrainCircuit className="mr-2 h-4 w-4" />
          )}
          Oyunu Başlat
        </Button>
      </CardFooter>
    </Card>
  );
}
