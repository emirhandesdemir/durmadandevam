// src/components/broadcast/FloatingHearts.tsx
'use client';
import { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface Heart {
  id: number;
  x: number;
  scale: number;
  duration: number;
}

export default function FloatingHearts({ trigger }: { trigger: boolean }) {
  const [hearts, setHearts] = useState<Heart[]>([]);

  useEffect(() => {
    if (trigger) {
      const createHeart = () => {
        return {
          id: Date.now() + Math.random(),
          x: Math.random() * 50 - 25, // -25 to +25
          scale: Math.random() * 0.5 + 0.5, // 0.5 to 1.0
          duration: Math.random() * 2 + 3, // 3s to 5s
        };
      };
      
      const newHearts: Heart[] = [];
      for(let i = 0; i < 5; i++) {
        newHearts.push(createHeart());
      }
      setHearts(prev => [...prev, ...newHearts]);

      setTimeout(() => {
          setHearts(prev => prev.filter(h => !newHearts.some(nh => nh.id === h.id)));
      }, 5000);
    }
  }, [trigger]);

  return (
    <div className="absolute bottom-20 right-5 pointer-events-none">
      <AnimatePresence>
        {hearts.map((heart) => (
          <motion.div
            key={heart.id}
            initial={{ y: 0, opacity: 1, scale: heart.scale }}
            animate={{ y: -300, x: heart.x, opacity: 0 }}
            transition={{ duration: heart.duration, ease: 'easeOut' }}
            exit={{ opacity: 0 }}
            className="absolute bottom-0"
          >
            <Heart className="text-red-500 fill-current" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
