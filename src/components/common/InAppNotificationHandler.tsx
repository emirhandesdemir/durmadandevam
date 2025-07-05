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
  );

  if (fullscreen) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center", isAuthPage ? 'auth-bg' : 'bg-background')}>
        {loader}
      </div>
    );
  }

  return loader;
}