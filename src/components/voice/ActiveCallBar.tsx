// src/components/voice/ActiveCallBar.tsx
'use client';

import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, ChevronRight, Users, MicOff as MicOffIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function ActiveCallBar() {
    const { isConnected, activeRoom, self, participants, leaveRoom, toggleSelfMute } = useVoiceChat();
    const pathname = usePathname();

    const isVisible = isConnected && activeRoom && !pathname.startsWith(`/rooms/${activeRoom.id}`) && !pathname.startsWith('/call/');

    if (!isVisible || !activeRoom) {
        return null;
    }

    const isMuted = self?.isMuted;
    const isSpeaking = self?.isSpeaker;

    return (
        <>
            {isVisible && (
                 <div
                    className="fixed bottom-[76px] left-0 right-0 z-40 px-2 pointer-events-none"
                 >
                    <div className="flex items-center justify-between gap-2 bg-primary/90 text-primary-foreground p-2 rounded-2xl shadow-lg w-full max-w-md mx-auto pointer-events-auto">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                             <div className={cn("flex items-center justify-center h-8 w-8 rounded-full bg-white/20 flex-shrink-0 transition-all ring-2", isSpeaking && !isMuted ? "ring-green-400" : "ring-transparent")}>
                                <Mic className={cn("h-5 w-5", isMuted && "hidden")} />
                                <MicOffIcon className={cn("h-5 w-5", !isMuted && "hidden")} />
                            </div>
                            <div className="overflow-hidden">
                                <p className="font-bold truncate text-sm">{activeRoom.name}</p>
                                <div className="flex items-center gap-1 text-xs opacity-80">
                                    <Users className="h-3 w-3" />
                                    <span>{participants.length} kişi</span>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button size="sm" className="rounded-full bg-white text-primary hover:bg-white/90" asChild>
                                <Link href={`/rooms/${activeRoom.id}`}>
                                    Geri Dön
                                    <ChevronRight className="h-4 w-4 ml-1"/>
                                </Link>
                            </Button>
                            <Button size="icon" variant="destructive" className="rounded-full h-9 w-9" onClick={leaveRoom}>
                                <PhoneOff className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                 </div>
            )}
        </>
    );
}
