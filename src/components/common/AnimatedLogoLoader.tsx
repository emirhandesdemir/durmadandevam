'use client';

import { cn } from '@/lib/utils';

const text = "HiweWalk";

interface AnimatedLogoLoaderProps {
  fullscreen?: boolean;
  className?: string;
  isAuthPage?: boolean;
}

export default function AnimatedLogoLoader({ fullscreen = false, className, isAuthPage = false }: AnimatedLogoLoaderProps) {
  const loader = (
    <div
      className={cn("flex overflow-hidden text-5xl font-extrabold tracking-tighter", className)}
    >
      {text.split("").map((letter, index) => (
        <span
          key={index}
          className={cn("inline-block", isAuthPage ? 'text-white' : 'text-primary')}
        >
          {letter}
        </span>
      ))}
    </div>
  );

  if (fullscreen) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center", isAuthPage ? 'bg-background' : 'bg-background')}>
        {loader}
      </div>
    );
  }

  return loader;
}
