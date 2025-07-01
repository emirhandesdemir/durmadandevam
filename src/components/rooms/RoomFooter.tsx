// src/components/rooms/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, LogOut, Loader2, ScreenShareOff, ScreenShare, Music, Music4 } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useRef } from 'react';

interface RoomFooterProps {
    room: Room;
}

export default function RoomFooter({ room }: RoomFooterProps) {
    const { user } = useAuth();
    const { 
        isConnected, 
        isConnecting, 
        joinRoom, 
        leaveRoom, 
        self, 
        toggleSelfMute,
        isSharingScreen,
        startScreenShare,
        stopScreenShare,
        isMusicPlaying,
        startMusic,
        stopMusic,
    } = useVoiceChat();

    const musicInputRef = useRef<HTMLInputElement>(null);
    
    const isParticipant = room.participants.some(p => p.uid === user?.uid);

    const handleJoinLeave = () => {
        if (isConnected) {
            leaveRoom();
        } else {
            joinRoom();
        }
    };
    
    const handleScreenShare = () => {
        if (isSharingScreen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    const handleMusicButtonClick = () => {
        if (isMusicPlaying) {
            stopMusic();
        } else {
            musicInputRef.current?.click();
        }
    };

    const handleMusicFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            startMusic(file);
        }
        if (event.target) {
            event.target.value = "";
        }
    };

    return (
        <footer className="sticky bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t p-2">
            <div className="flex w-full items-center space-x-2">
                <ChatMessageInput roomId={room.id} canSendMessage={isParticipant} />

                <Popover>
                    <PopoverTrigger asChild>
                         <Button variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                            <Settings className="h-5 w-5" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" side="top" className="w-auto p-2">
                        <div className="flex items-center gap-1 bg-background rounded-full">
                             <Button onClick={handleJoinLeave} variant="secondary" className="rounded-full px-4" disabled={isConnecting}>
                                {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : isConnected ? <><LogOut className="mr-2 h-4 w-4"/>Ayrıl</> : 'Katıl'}
                            </Button>
                            <Button onClick={toggleSelfMute} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                {self?.isMuted ? <MicOff className="text-destructive"/> : <Mic />}
                            </Button>
                            <Button onClick={handleScreenShare} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                               {isSharingScreen ? <ScreenShareOff className="text-destructive"/> : <ScreenShare />}
                            </Button>
                            <input
                                type="file"
                                ref={musicInputRef}
                                onChange={handleMusicFileChange}
                                accept="audio/*"
                                className="hidden"
                            />
                            <Button onClick={handleMusicButtonClick} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                               {isMusicPlaying ? <Music4 className="text-primary"/> : <Music />}
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>

            </div>
        </footer>
    );
}
