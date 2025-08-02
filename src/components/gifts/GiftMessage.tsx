// src/components/gifts/GiftMessage.tsx
'use client';

import type { Message } from '@/lib/types';
import { getGiftById } from '@/lib/gifts';
import { motion } from 'framer-motion';
import { Badge } from '../ui/badge';
import { Sparkles, Star } from 'lucide-react';

export default function GiftMessage({ message }: { message: Message }) {
  if (!message.giftData) return null;

  const { senderName, receiverName, giftId, senderLevel } = message.giftData;
  const gift = getGiftById(giftId);

  // CRITICAL FIX: Ensure gift and gift.icon exist before rendering.
  if (!gift || !gift.icon) {
    console.error(`Gift or gift icon not found for id: ${giftId}`);
    return null; // Render nothing if the gift or its icon is invalid
  }
  
  const GiftIcon = gift.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="flex flex-col items-center justify-center gap-2 my-4 p-4 rounded-xl bg-gradient-to-tr from-yellow-400/10 via-amber-500/10 to-red-500/10 border-2 border-amber-500/20 text-center"
    >
      <div className="flex items-center gap-2">
        {senderLevel && senderLevel > 0 && (
            <Badge variant="destructive" className="animate-pulse">
                <Star className="h-3 w-3 mr-1"/> SV {senderLevel}
            </Badge>
        )}
         <p className="text-sm font-medium">
            <strong className="text-primary">{senderName}</strong>
        </p>
      </div>

      <GiftIcon className="h-16 w-16 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.8)] my-2" />
      <p className="text-lg font-bold">
        {receiverName ? <strong className="text-primary">{receiverName}</strong> : 'Odaya'} <strong className="text-amber-500">{gift.name}</strong> gönderdi!
      </p>
    </motion.div>
  );
}
