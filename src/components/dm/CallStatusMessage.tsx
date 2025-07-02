// src/components/dm/CallStatusMessage.tsx
'use client';

import { DirectMessage } from '@/lib/types';
import { Phone, PhoneMissed, PhoneOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CallStatusMessageProps {
  message: DirectMessage;
}

export default function CallStatusMessage({ message }: CallStatusMessageProps) {
  if (!message.callData) return null;

  const { status, duration } = message.callData;
  let Icon = Phone;
  let text = 'Arama';

  switch (status) {
    case 'started':
      Icon = Phone;
      text = 'Arama başlatıldı';
      break;
    case 'ended':
      Icon = PhoneOff;
      text = `Arama bitti · ${duration || ''}`;
      break;
    case 'missed':
      Icon = PhoneMissed;
      text = 'Cevapsız arama';
      break;
    case 'declined':
        Icon = PhoneOff;
        text = 'Arama reddedildi';
        break;
  }

  return (
    <div className="flex justify-center items-center my-2">
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs text-muted-foreground">
        <Icon className={cn("h-4 w-4", status === 'missed' && 'text-destructive')} />
        <span>{text}</span>
      </div>
    </div>
  );
}
