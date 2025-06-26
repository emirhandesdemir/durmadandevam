'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, X, Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function PersistentVoiceBar() {
    const { isConnected, activeRoom, self, toggleSelfMute, leaveRoom } = useVoiceChat();
    const pathname = usePathname();

    // Odanın kendi sayfasındaysak veya bağlı değilsek bu çubuğu gösterme
    if (!isConnected || pathname.startsWith(`/rooms/${activeRoom?.id}`)) {
        return null;
    }

    const handleLeave = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        leaveRoom();
    };

    const handleToggleMute = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSelfMute();
    }

    return (
        <div className="fixed bottom-20 left-0 right-0 z-50 p-2 animate-in slide-in-from-bottom-5 duration-300">
            <Link href={`/rooms/${activeRoom?.id}`} className="block">
                <div className="container max-w-4xl mx-auto">
                    <div className="flex items-center justify-between gap-4 rounded-full bg-gray-900/90 text-white p-2 pl-4 border border-gray-700/50 backdrop-blur-md shadow-lg">
                        <div className="flex items-center gap-3">
                            <Headphones className={cn("h-5 w-5", self?.isMuted ? "text-red-500" : "text-green-500 animate-pulse")} />
                            <div>
                                <p className="font-bold text-sm truncate">{activeRoom?.name}</p>
                                <p className="text-xs text-gray-400">Sesli sohbettesin. Geri dönmek için tıkla.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                             <Button onClick={handleToggleMute} variant="ghost" size="icon" className="rounded-full bg-gray-700/50 hover:bg-gray-600/50 text-white hover:text-white">
                                {self?.isMuted ? <MicOff className="h-5 w-5 text-red-500"/> : <Mic className="h-5 w-5 text-white"/>}
                            </Button>
                             <Button onClick={handleLeave} variant="ghost" size="icon" className="rounded-full bg-red-600/50 hover:bg-red-500 text-white hover:text-white">
                                <X className="h-5 w-5"/>
                            </Button>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
