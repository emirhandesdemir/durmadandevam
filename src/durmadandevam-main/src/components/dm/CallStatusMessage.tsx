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
  let color = 'text-muted-foreground';

  switch (status) {
    case 'ended':
      Icon = PhoneOff;
      text = `Arama bitti · ${duration || ''}`;
      color = 'text-muted-foreground';
      break;
    case 'missed':
      Icon = PhoneMissed;
      text = 'Cevapsız arama';
      color = 'text-destructive';
      break;
    case 'declined':
        Icon = PhoneOff;
        text = 'Arama reddedildi';
        color = 'text-destructive';
        break;
    default:
       return null; // Don't show for 'started' or other statuses
  }

  return (
    <div className="flex justify-center items-center my-2">
      <div className={cn("flex items-center gap-2 px-3 py-1.5 bg-muted rounded-full text-xs", color)}>
        <Icon className="h-4 w-4" />
        <span>{text}</span>
      </div>
    </div>
  );
}
