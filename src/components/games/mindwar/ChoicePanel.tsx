// src/components/games/mindwar/ChoicePanel.tsx
'use client';

// Bu bileşen, Zihin Savaşları oyununda sırası gelen oyuncuya sunulan
// eylem seçeneklerini gösterir.

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { makeMindWarMove } from '@/lib/actions/mindWarActions';
import { useToast } from '@/hooks/use-toast';
import type { MindWarSession } from '@/lib/types';
import { motion } from 'framer-motion';

interface ChoicePanelProps {
  session: MindWarSession; // Mevcut oyun oturumu
  roomId: string; // Oda ID'si
  currentUserId: string; // Mevcut kullanıcının ID'si
}

export default function ChoicePanel({ session, roomId, currentUserId }: ChoicePanelProps) {
  const [isLoading, setIsLoading] = useState<string | null>(null); // Hangi seçeneğin işlendiğini takip eder
  const { toast } = useToast();

  // Eğer sıra bu kullanıcıda değilse veya oyun bitmişse, paneli gösterme
  if (session.currentTurn.activePlayerUid !== currentUserId || session.status !== 'ongoing') {
    return null;
  }

  // Kullanıcıya sunulan seçenekleri al
  const choices = session.currentTurn.choices || {};

  // Bir seçeneğe tıklandığında çalışacak fonksiyon
  const handleChoice = async (choiceKey: string, choiceText: string) => {
    setIsLoading(choiceKey); // Yükleme animasyonunu başlat
    try {
      // Sunucu eylemini çağırarak oyuncunun hamlesini işle
      await makeMindWarMove({
        roomId,
        sessionId: session.id,
        playerId: currentUserId,
        choice: {
          key: choiceKey,
          text: choiceText,
        },
      });
    } catch (error: any) {
      // Hata durumunda kullanıcıya bilgi ver
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: `Seçim işlenirken bir sorun oluştu: ${error.message}`,
      });
    } finally {
      // Yükleme durumunu sıfırla (genellikle gerek kalmaz çünkü bileşen yeni tur verisiyle güncellenir)
      setIsLoading(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.5 }}
      className="mt-4 p-4 bg-background/50 border border-primary/20 rounded-xl shadow-lg"
    >
      <h3 className="font-bold text-center text-primary mb-3">Sıra Sende! Ne yapacaksın?</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Object.entries(choices).map(([key, text]) => (
          <Button
            key={key}
            onClick={() => handleChoice(key, text)}
            disabled={!!isLoading}
            size="lg"
            className="h-auto py-3 whitespace-normal"
          >
            {isLoading === key ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              // Seçenek metnini göster
              <span className="font-semibold">{key}:</span>
            )}
            <span className="ml-2 text-left flex-1">{text}</span>
          </Button>
        ))}
      </div>
    </motion.div>
  );
}
