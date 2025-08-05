// src/components/rooms/EntryEffectManager.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import type { VoiceParticipant } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AnimatedCastle } from '@/components/gifts/GiftAnimations';

interface EntryEffectManagerProps {
  participants: VoiceParticipant[];
}

export default function EntryEffectManager({ participants }: EntryEffectManagerProps) {
    const [justJoined, setJustJoined] = useState<VoiceParticipant | null>(null);
    const prevParticipantIds = useRef<Set<string>>(new Set(participants.map(p => p.uid)));
    const activeEffectTimeout = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const currentIds = new Set(participants.map(p => p.uid));
        
        // Find a new participant who wasn't there before
        const newParticipant = participants.find(p => 
            !prevParticipantIds.current.has(p.uid) && 
            p.giftLevel >= 3
        );

        if (newParticipant && !justJoined) { // Only trigger if there isn't an active effect
            setJustJoined(newParticipant);

            // Clear any existing timer before setting a new one
            if (activeEffectTimeout.current) {
                clearTimeout(activeEffectTimeout.current);
            }

            activeEffectTimeout.current = setTimeout(() => {
                setJustJoined(null);
                activeEffectTimeout.current = null;
            }, 5000); // Effect duration
        }
        
        // Update the set of previous participants for the next render
        prevParticipantIds.current = currentIds;

        // Cleanup the timer when the component unmounts
        return () => {
            if (activeEffectTimeout.current) {
                clearTimeout(activeEffectTimeout.current);
            }
        };

    }, [participants, justJoined]);

    return (
        <AnimatePresence>
            {justJoined && (
                <motion.div
                    key={justJoined.uid}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, transition: { duration: 1 } }}
                    className="fixed inset-0 z-[200] pointer-events-none flex flex-col items-center justify-center overflow-hidden bg-black/50"
                >
                    <motion.div
                        initial={{ scale: 0.5, y: 100 }}
                        animate={{ scale: 1, y: 0 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                        className="text-center"
                    >
                        <AnimatedCastle className="fullscreen-gift-icon" />
                        <h2 className="text-2xl font-bold text-white mt-4 drop-shadow-lg">
                            Hediye Seviyesi {justJoined.giftLevel} Lideri
                        </h2>
                        <p className="text-xl text-yellow-300 drop-shadow-md">
                            {justJoined.username} odaya katıldı!
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
