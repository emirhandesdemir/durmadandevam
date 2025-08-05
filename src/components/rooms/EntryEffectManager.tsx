// src/components/rooms/EntryEffectManager.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import type { VoiceParticipant } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedCastle } from '@/components/gifts/GiftAnimations';

interface EntryEffectManagerProps {
  participants: VoiceParticipant[];
}

export default function EntryEffectManager({ participants }: EntryEffectManagerProps) {
    const [justJoined, setJustJoined] = useState<VoiceParticipant | null>(null);
    const prevParticipantIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Initialize the ref with the initial participants on mount
        prevParticipantIds.current = new Set(participants.map(p => p.uid));
    }, []);

    useEffect(() => {
        const currentIds = new Set(participants.map(p => p.uid));
        
        // Find a new participant who wasn't there in the previous render
        const newParticipant = participants.find(p => 
            !prevParticipantIds.current.has(p.uid) && 
            p.giftLevel >= 3
        );

        if (newParticipant) {
            setJustJoined(newParticipant);
            const timer = setTimeout(() => {
                setJustJoined(null);
            }, 5000); // Effect duration: 5 seconds

            return () => clearTimeout(timer); // Cleanup on unmount or if effect re-runs
        }
        
        // IMPORTANT: Update the previous IDs state for the next render *after* checking.
        prevParticipantIds.current = currentIds;

    }, [participants]);

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
