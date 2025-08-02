// src/components/live/LiveParticipantList.tsx
'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { XCircle } from 'lucide-react';

// For this prototype, we'll just display participants.
// A real app would need a more complex participant object with status etc.
interface Participant {
    uid: string;
    username: string;
    photoURL?: string | null;
}

interface LiveParticipantListProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  participants: Participant[];
  onKickUser: (userId: string) => void;
  isHost: boolean;
}

export default function LiveParticipantList({ isOpen, onOpenChange, participants, onKickUser, isHost }: LiveParticipantListProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Katılımcılar ({participants.length})</SheetTitle>
          <SheetDescription>Bu yayını izleyen kullanıcılar.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="h-[calc(100%-8rem)] mt-4">
            <div className="space-y-4">
                {participants.map(p => (
                    <div key={p.uid} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={p.photoURL || undefined} />
                                <AvatarFallback>{p.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <p className="font-semibold">{p.username}</p>
                        </div>
                        {isHost && (
                             <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => onKickUser(p.uid)}>
                                <XCircle className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                ))}
            </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
