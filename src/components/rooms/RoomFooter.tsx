// src/components/rooms/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Volume2, Mic, MicOff, Smile, Gift, AppWindow, Loader2 } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface RoomFooterProps {
    room: Room;
}

export default function RoomFooter({ room }: RoomFooterProps) {
    const { user } = useAuth();
    const { isConnected, isConnecting, joinRoom, leaveRoom, self, toggleSelfMute } = useVoiceChat();
    const isParticipant = room.participants.some(p => p.uid === user?.uid);

    return (
        <footer className="sticky bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t p-2 space-y-2">
            {/* TODO: Add logic for gifts, emojis etc. */}
            <div className="flex items-center justify-between gap-1">
                 <Button variant="ghost" size="icon" className="rounded-full"><Volume2 /></Button>
                <Button onClick={toggleSelfMute} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                    {self?.isMuted ? <MicOff className="text-destructive"/> : <Mic />}
                </Button>
                <Button onClick={() => isConnected ? leaveRoom() : joinRoom()} variant="secondary" className="rounded-full px-6" disabled={isConnecting}>
                     {isConnecting ? <Loader2 className="h-4 w-4 animate-spin"/> : isConnected ? 'Ayrıl' : 'Enter'}
                </Button>
                <Button variant="ghost" size="icon" className="rounded-full"><Smile /></Button>
                <Button variant="ghost" size="icon" className="rounded-full"><Gift /></Button>
                <Button variant="ghost" size="icon" className="rounded-full"><AppWindow /></Button>
            </div>
            <ChatMessageInput roomId={room.id} canSendMessage={isParticipant} />
        </footer>
    );
}
