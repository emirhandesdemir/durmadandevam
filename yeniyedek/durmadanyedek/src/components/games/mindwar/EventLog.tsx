// src/components/games/mindwar/EventLog.tsx
'use client';

// Bu bileşen, Zihin Savaşları oyunundaki hikaye ve olay akışını gösterir.
// Yapay zeka anlatıcısının mesajları burada listelenir.

import { useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, User, CheckCircle } from 'lucide-react';
import type { MindWarTurn } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';

interface EventLogProps {
  gameHistory: MindWarTurn[]; // Geçmiş tüm turların kaydı
  currentTurn: MindWarTurn; // Mevcut aktif tur
}

export default function EventLog({ gameHistory, currentTurn }: EventLogProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Yeni bir mesaj geldiğinde otomatik olarak en alta kaydır
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [gameHistory, currentTurn]);

  // Görüntülenecek tüm olayları birleştir (geçmiş + mevcut tur)
  const allEvents = [...gameHistory, currentTurn];

  return (
    <div className="bg-muted/50 rounded-lg p-2 h-64 flex flex-col">
      <ScrollArea className="flex-1 px-2" ref={scrollAreaRef}>
        <div className="space-y-4 py-2">
          <AnimatePresence>
            {allEvents.map((turn, index) => (
              <motion.div
                key={turn.timestamp?.toString() || index}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Anlatıcı (Yapay Zeka) Mesajı */}
                {turn.narrative && (
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/20 rounded-full text-primary">
                      <Bot size={18} />
                    </div>
                    <div className="flex-1 bg-background/70 rounded-lg p-3 text-sm">
                      <p className="whitespace-pre-wrap">{turn.narrative}</p>
                    </div>
                  </div>
                )}
                {/* Oyuncu Seçimi ve Sonucu */}
                {turn.playerChoice && (
                   <>
                    <div className="flex items-start gap-3 mt-2 justify-end">
                        <div className="flex-1 bg-blue-500/10 rounded-lg p-3 text-sm text-right">
                          <p className="font-bold">{turn.playerChoice.uid}</p>
                          <p className="italic">"{turn.playerChoice.choiceText}" dedi.</p>
                        </div>
                         <div className="p-2 bg-blue-500/20 rounded-full text-blue-500">
                          <User size={18} />
                        </div>
                    </div>
                     <div className="flex items-start gap-3 mt-2">
                        <div className="p-2 bg-green-500/20 rounded-full text-green-600">
                          <CheckCircle size={18} />
                        </div>
                        <div className="flex-1 bg-background/70 rounded-lg p-3 text-sm">
                            <p className="font-bold text-green-600">Sonuç:</p>
                            <p className="whitespace-pre-wrap">{turn.outcome}</p>
                        </div>
                    </div>
                   </>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
