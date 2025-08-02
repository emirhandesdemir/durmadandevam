// src/components/gifts/GiftMessage.tsx
'use client';

import type { Message } from '@/lib/types';
import { getGiftById } from '@/lib/gifts';
import { motion } from 'framer-motion';

export default function GiftMessage({ message }: { message: Message }) {
  if (!message.giftData) return null;

  const { senderName, receiverName, giftId } = message.giftData;
  const gift = getGiftById(giftId);

  if (!gift) return null;
  
  const GiftIcon = gift.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="flex flex-col items-center justify-center gap-2 my-4 p-4 rounded-xl bg-gradient-to-tr from-yellow-400/10 via-amber-500/10 to-red-500/10 border-2 border-amber-500/20 text-center"
    >
      <GiftIcon className="h-12 w-12 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
      <p className="text-sm font-medium">
        <strong className="text-primary">{senderName}</strong>, {receiverName ? <><strong className="text-primary">{receiverName}</strong>'a</> : 'odaya'} bir <strong className="text-amber-500">{gift.name}</strong> gönderdi!
      </p>
    </motion.div>
  );
}
