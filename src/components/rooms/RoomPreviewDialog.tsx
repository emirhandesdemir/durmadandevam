// src/components/rooms/RoomPreviewDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '../ui/button';
import { Users, Info, ArrowRight } from 'lucide-react';
import type { Room } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { joinRoom } from '@/lib/actions/roomActions';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { ScrollArea } from '../ui/scroll-area';

interface RoomPreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room;
}

export default function RoomPreviewDialog({ isOpen, onOpenChange, room }: RoomPreviewDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();

  const handleJoin = async () => {
    if (!user) return;
    try {
        await joinRoom(room.id, {
            uid: user.uid,
            username: user.displayName || 'Bilinmeyen',
            photoURL: user.photoURL,
        });
        onOpenChange(false);
        router.push(`/rooms/${room.id}`);
    } catch (error: any) {
        toast({ variant: 'destructive', description: `Odaya katılırken bir hata oluştu: ${error.message}` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{room.name}</DialogTitle>
          <DialogDescription>{room.description}</DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-4">
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Info className='h-4 w-4'/>
                <span>Oda sahibi: <span className='font-semibold text-foreground'>{room.createdBy.username}</span></span>
            </div>
            <div className='flex items-center gap-2 text-sm text-muted-foreground'>
                <Users className='h-4 w-4'/>
                <span>{room.participants.length} / {room.maxParticipants} Katılımcı</span>
            </div>
            <p className="font-semibold">Katılımcılar</p>
            <ScrollArea className="h-32">
                <div className="space-y-2">
                    {room.participants.map(p => (
                        <div key={p.uid} className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={p.photoURL || undefined} />
                                <AvatarFallback>{p.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{p.username}</span>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Kapat</Button>
          <Button onClick={handleJoin}>
            Odaya Katıl <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
