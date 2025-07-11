// src/app/(main)/matchmaking/layout.tsx
import { ReactNode } from 'react';

// This layout ensures that the matchmaking pages use the full screen height.
export default function MatchmakingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full bg-background">
      {children}
    </div>
  );
}
