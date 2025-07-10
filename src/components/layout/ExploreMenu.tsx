'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Map, Search, UserSearch } from 'lucide-react';
import Link from 'next/link';

interface ExploreMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSearchClick: () => void;
}

const menuVariants = {
  hidden: { y: '100%', opacity: 0.8 },
  visible: { y: '0%', opacity: 1, transition: { type: 'spring', damping: 20, stiffness: 200 } },
  exit: { y: '100%', opacity: 0, transition: { duration: 0.2 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ExploreMenu({ isOpen, onOpenChange, onSearchClick }: ExploreMenuProps) {
  
  const handleSearchClick = () => {
    onOpenChange(false);
    onSearchClick();
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          variants={menuVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="fixed bottom-[65px] left-0 right-0 z-40 mx-auto w-[calc(100%-2rem)] max-w-md p-3"
          style={{ pointerEvents: 'auto' }}
        >
          <div className="grid grid-cols-2 gap-3 rounded-2xl border bg-background/80 p-3 shadow-lg backdrop-blur-lg">
            <motion.div variants={itemVariants} transition={{ delay: 0.1 }}>
              <Button asChild variant="secondary" className="h-20 w-full flex-col gap-1 rounded-xl">
                <Link href="/nearby" onClick={() => onOpenChange(false)}>
                  <Map className="h-6 w-6" />
                  <span className="text-xs font-semibold">Yakındakileri Keşfet</span>
                </Link>
              </Button>
            </motion.div>
            <motion.div variants={itemVariants} transition={{ delay: 0.15 }}>
              <Button variant="secondary" className="h-20 w-full flex-col gap-1 rounded-xl" onClick={handleSearchClick}>
                   <UserSearch className="h-6 w-6" />
                  <span className="text-xs font-semibold">Kullanıcı Ara</span>
              </Button>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
