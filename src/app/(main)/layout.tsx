'use client';

import { useState, useEffect, useRef } from 'react';
import BottomNav from "@/components/layout/bottom-nav";
import { VoiceChatProvider } from "@/contexts/VoiceChatContext";
import PersistentVoiceBar from "@/components/voice/PersistentVoiceBar";
import VoiceAudioPlayer from "@/components/voice/VoiceAudioPlayer";
import Header from "@/components/layout/Header";
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from "next/navigation";

export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isHeaderVisible, setHeaderVisible] = useState(true);
  const mainRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const mainEl = mainRef.current;
    
    const handleScroll = () => {
        if (!mainEl) return;
        const currentScrollY = mainEl.scrollTop;

        // Hide header
        if (currentScrollY > lastScrollY.current && currentScrollY > 70) {
            setHeaderVisible(false);
        } 
        // Show header
        else if (currentScrollY < lastScrollY.current) {
            setHeaderVisible(true);
        }
        lastScrollY.current = currentScrollY;
    };

    if (mainEl) {
        mainEl.addEventListener('scroll', handleScroll, { passive: true });
        return () => mainEl.removeEventListener('scroll', handleScroll);
    }
  }, []);

  return (
    <VoiceChatProvider>
      <div className="flex h-dvh w-full flex-col bg-background overflow-hidden">
        <AnimatePresence>
          {isHeaderVisible && (
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '0%' }}
              exit={{ y: '-100%' }}
              transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
              className="w-full shrink-0 z-40"
            >
              <Header />
            </motion.div>
          )}
        </AnimatePresence>
        
        <main
          ref={mainRef}
          className="flex-1 overflow-y-auto pb-24"
        >
          <motion.div
            key={pathname}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
        
        <VoiceAudioPlayer />
        <PersistentVoiceBar />
        <BottomNav />
      </div>
    </VoiceChatProvider>
  );
}
