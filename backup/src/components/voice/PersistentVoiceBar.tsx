'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Users, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useAuth } from '@/contexts/AuthContext';


export default function PersistentVoiceBar() {
    const { user } = useAuth();
    const { isConnected, activeRoom, self, participants, leaveRoom } = useVoiceChat();
    const pathname = usePathname();

    // Odanın kendi sayfasındaysak veya bağlı değilsek bu çubuğu gösterme
    if (!isConnected || (activeRoom && pathname.startsWith(`/rooms/${activeRoom.id}`))) {
        return null;
    }

    const handleLeave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        leaveRoom();
    };

    const isSpeaking = self?.isSpeaker && !self?.isMuted;

    return (
        <div className="fixed bottom-20 right-4 z-50 flex items-start gap-2 animate-in slide-in-from-right-5 duration-300">
             {/* Kapatma Butonu */}
            <Button 
                onClick={handleLeave} 
                variant="destructive" 
                size="icon" 
                className="rounded-full shadow-lg h-9 w-9"
            >
                <X className="h-5 w-5"/>
                <span className="sr-only">Sesli Sohbetten Ayrıl</span>
            </Button>
            
            {/* Tıklanabilir Kapsül */}
            <Link href={`/rooms/${activeRoom?.id}`} className="block">
                 <div className="flex flex-col items-center gap-3 p-3 rounded-full bg-primary/90 text-primary-foreground backdrop-blur-md shadow-lg border border-primary/20 hover:scale-105 transition-transform duration-200">
                    <Avatar className="h-14 w-14 border-2 border-background">
                         <AvatarImage src={self?.photoURL || user?.photoURL || undefined} />
                         <AvatarFallback>{self?.username?.charAt(0) || user?.displayName?.charAt(0)}</AvatarFallback>
                        {isSpeaking && (
                             <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                                <Mic className="h-6 w-6 text-white animate-pulse" />
                            </div>
                        )}
                    </Avatar>
                     <div className="flex items-center gap-1.5 text-sm font-bold">
                        <Users className="h-4 w-4" />
                        <span>{participants.length}</span>
                    </div>
                </div>
            </Link>
        </div>
    );
}
