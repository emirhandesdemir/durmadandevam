// src/components/voice/PersistentVoiceBar.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { X, Users } from 'lucide-react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

export default function PersistentVoiceBar() {
    const { user } = useAuth();
    const { isConnected, activeRoom, self, participants, leaveRoom } = useVoiceChat();
    const pathname = usePathname();

    // Do not show the bar if not connected, or if we are already on the room page
    if (!isConnected || !activeRoom || pathname.startsWith(`/rooms/${activeRoom.id}`)) {
        return null;
    }

    const handleLeave = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await leaveRoom();
    };

    const isSpeaking = self?.isSpeaker && !self?.isMuted;

    return (
        <div className="fixed bottom-20 right-4 z-50 animate-in slide-in-from-right-5 duration-300">
            <div className="relative group">
                {/* Main clickable area to go back to the room */}
                <Link href={`/rooms/${activeRoom.id}`} className={cn(
                    "block p-1.5 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-md shadow-lg border-2 transition-all duration-300",
                    isSpeaking ? "border-green-400" : "border-primary/20",
                )}>
                    <Avatar className="h-14 w-14">
                        <AvatarImage src={self?.photoURL || user?.photoURL || undefined} />
                        <AvatarFallback>{self?.username?.charAt(0) || user?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                </Link>

                {/* Participant Count Badge */}
                <div className="absolute -bottom-1 -left-1 flex items-center justify-center h-7 w-7 rounded-full bg-secondary text-secondary-foreground text-xs font-bold border-2 border-background">
                    <Users className="h-3 w-3 mr-0.5" />
                    {participants.length}
                </div>

                 {/* Leave Button (shows on hover) */}
                <Button 
                    onClick={handleLeave} 
                    variant="destructive" 
                    size="icon" 
                    className="absolute -top-2 -right-2 rounded-full shadow-lg h-7 w-7 border-2 border-background opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4"/>
                    <span className="sr-only">Sesli Sohbetten Ayrıl</span>
                </Button>
            </div>
        </div>
    );
}
