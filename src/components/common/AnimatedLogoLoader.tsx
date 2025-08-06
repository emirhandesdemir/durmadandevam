
'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.2,
    },
  },
};

const letterVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 120,
      damping: 12,
    },
  },
};

const text = "HiweWalk";

interface AnimatedLogoLoaderProps {
  fullscreen?: boolean;
  className?: string;
  isAuthPage?: boolean;
}

export default function AnimatedLogoLoader({ fullscreen = false, className, isAuthPage = false }: AnimatedLogoLoaderProps) {
  const loader = (
     <div className="flex flex-col items-center gap-6">
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className={cn("flex overflow-hidden text-5xl font-extrabold tracking-tighter", className)}
        >
            {text.split("").map((letter, index) => (
                <motion.span
                key={index}
                variants={letterVariants}
                className={cn("inline-block", isAuthPage ? 'text-white' : 'text-primary')}
                >
                {letter}
                </motion.span>
            ))}
        </motion.div>
        <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className={cn(
                "h-8 w-8 rounded-full border-4 border-b-transparent",
                isAuthPage ? 'border-white/80 border-b-transparent' : 'border-primary/80 border-b-transparent'
            )}
        />
     </div>
  );

  if (fullscreen) {
    return (
      <div className={cn("flex min-h-screen flex-col items-center justify-center", isAuthPage ? 'auth-bg' : 'bg-background')}>
        <div className="flex-1 flex items-center justify-center">
             {loader}
        </div>
      </div>
    );
  }

  return loader;
}
