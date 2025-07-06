// src/components/games/mindwar/MindWarMainUI.tsx
'use client';

// Bu bileşen, "Zihin Savaşları" oyununun ana arayüzünü oluşturur.
// Oyunun durumuna göre Lobi, Ana Oyun Ekranı veya Sonuç Ekranı'nı gösterir.

import type { MindWarSession } from '@/lib/types';
import PlayerStatus from './PlayerStatus';
import EventLog from './EventLog';
import ChoicePanel from './ChoicePanel';
import GameEndSummary from './GameEndSummary';
import { AnimatePresence, motion } from 'framer-motion';

interface MindWarMainUIProps {
  session: MindWarSession; // Mevcut oyun oturumu verisi
  roomId: string; // Oyunun oynandığı oda ID'si
  currentUser: { // Mevcut kullanıcı bilgileri
    uid: string;
    username: string;
    photoURL: string | null;
  };
}

export default function MindWarMainUI({ session, roomId, currentUser }: MindWarMainUIProps) {
  
  // Eğer oyun bittiyse, oyun sonu özetini göster
  if (session.status === 'finished') {
    return <GameEndSummary session={session} />;
  }

  // Mevcut kullanıcının oyuncu olup olmadığını ve rolünü bul
  const currentPlayer = session.players.find(p => p.uid === currentUser.uid);

  return (
    <div className="w-full mx-auto space-y-4 rounded-xl bg-card p-4 border-2 border-primary/30 shadow-2xl shadow-primary/10">
      <AnimatePresence mode="wait">
        <motion.div
          key={session.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Oyuncu Durumları ve Rolleri */}
          <PlayerStatus
            players={session.players}
            currentTurn={session.currentTurn}
            currentUserRole={currentPlayer?.role}
            currentUserId={currentUser.uid}
          />
          
          {/* Olay ve Hikaye Akışı */}
          <EventLog
            gameHistory={session.gameHistory}
            currentTurn={session.currentTurn}
          />

          {/* Eylem ve Seçim Paneli (Sadece sırası gelen oyuncu için) */}
          <ChoicePanel
            session={session}
            roomId={roomId}
            currentUserId={currentUser.uid}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
