// src/components/common/AvatarWithFrame.tsx
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { memo } from 'react';
import { getAvatarById, type AvatarInfo } from "./CustomAvatars";

interface AvatarWithFrameProps {
  photoURL: string | null | undefined;
  selectedAvatarFrame?: string;
  fallback?: React.ReactNode;
  className?: string;
  fallbackClassName?: string;
}

const AvatarWithFrame = memo(({
  photoURL,
  selectedAvatarFrame,
  fallback,
  className,
  fallbackClassName,
}: AvatarWithFrameProps) => {

  const CustomAvatar = getAvatarById(photoURL || '');

  return (
    <div className={cn("avatar-frame-wrapper", selectedAvatarFrame)}>
      <div className={cn("relative z-[1]", className)}>
        {CustomAvatar ? (
          <CustomAvatar className="h-full w-full" />
        ) : (
          <Avatar className="h-full w-full">
            <AvatarImage src={photoURL || undefined} />
            <AvatarFallback className={cn(fallbackClassName)}>
              {fallback}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
});

AvatarWithFrame.displayName = 'AvatarWithFrame';

export default AvatarWithFrame;
