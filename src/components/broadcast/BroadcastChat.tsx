// src/components/broadcast/BroadcastChat.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Message } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface BroadcastChatProps {
  roomId: string;
}

export default function BroadcastChat({ roomId }: BroadcastChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, 'rooms', roomId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as Message))
        .reverse();
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [roomId]);
  
  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages])

  return (
    <div 
        ref={scrollRef}
        className="h-1/2 w-full max-w-sm overflow-y-auto pr-2 [mask-image:linear-gradient(to_top,transparent_0%,#000_20%)]"
    >
      <div className="flex flex-col-reverse justify-start">
        <AnimatePresence>
            {messages.map((message) => {
                if(message.type === 'system' || message.type === 'game' || message.type === 'portal') return null;
                return (
                    <motion.div
                        key={message.id}
                        layout
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        className="flex items-start gap-2 rounded-lg p-2 mb-1"
                    >
                         <Avatar className="h-6 w-6">
                            <AvatarImage src={message.photoURL || undefined} />
                            <AvatarFallback>{message.username?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white/80">{message.username}</span>
                            <p className="text-sm">{message.text}</p>
                        </div>
                    </motion.div>
                )
            })}
        </AnimatePresence>
      </div>
    </div>
  );
}
