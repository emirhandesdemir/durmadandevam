// src/components/gifts/GiftMessage.tsx
'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/lib/types';
import { getGiftById } from '@/lib/gifts';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';

interface GiftMessageProps {
  message: Message;
}

export default function GiftMessage({ message }: { message: Message }) {
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    if (message.createdAt) {
      const messageTime = (message.createdAt as Timestamp).toMillis();
      const currentTime = Date.now();
      // Show animation only if the message is newer than 10 seconds
      if (currentTime - messageTime < 10000) {
        setShowAnimation(true);
        const timer = setTimeout(() => setShowAnimation(false), 4000); // Animation duration
        return () => clearTimeout(timer);
      }
    }
  }, [message.createdAt]);

  if (!message.giftData) return null;

  const { senderName, receiverName, giftId, senderLevel } = message.giftData;
  const gift = getGiftById(giftId);

  if (!gift) {
    console.error(`Gift or gift icon not found for id: ${giftId}`);
    return null;
  }
  
  const GiftIcon = gift.icon;
  if (!GiftIcon) return null;

  const receiverText = receiverName ? (
    <>
        <strong className="text-primary">{receiverName}</strong> adlı kullanıcıya
    </>
    ) : (
    'odaya'
    );

  return (
    <>
      {/* Fullscreen Animation Overlay */}
      <AnimatePresence>
        {showAnimation && (
          <motion.div
            key="gift-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 1 } }}
            className={cn(
              "fixed inset-0 z-[200] pointer-events-none flex items-center justify-center overflow-hidden",
              gift.animationClass
            )}
          >
            <GiftIcon className="fullscreen-gift-icon" />
            {/* Particle effects for certain gifts */}
            {gift.id === 'rose' && Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="particle rose" style={{ left: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }} />
            ))}
            {gift.id === 'popper' && Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="particle confetti" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 0.5}s`, background: `hsl(${Math.random() * 360}, 70%, 50%)` }} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Message Card */}
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.8 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="flex flex-col items-center justify-center gap-2 my-4 p-4 rounded-xl bg-gradient-to-tr from-yellow-400/10 via-amber-500/10 to-red-500/10 border-2 border-amber-500/20 text-center relative overflow-hidden"
      >
        <div className="relative z-10 flex items-center gap-2">
            {senderLevel && senderLevel > 0 && (
                <Badge variant="destructive" className="animate-pulse">
                    <Star className="h-3 w-3 mr-1"/> SV {senderLevel}
                </Badge>
            )}
            <p className="text-sm font-medium">
                <strong className="text-primary">{senderName}</strong>
            </p>
        </div>
        
        <p className="relative z-10 text-lg font-bold">
            {receiverText} <strong className="text-amber-500">{gift.name}</strong> gönderdi!
        </p>
    </motion.div>
    </>
  );
}
