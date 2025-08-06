// src/components/rooms/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, Loader2, Gamepad2, Gift, Volume2, VolumeX, PhoneOff } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import GiftPanel from '../gifts/GiftPanel';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';


interface RoomFooterProps {
    room: Room;
    onGameLobbyOpen: () => void;
    onGiveawayOpen: () => void;
}

export default function RoomFooter({ room, onGameLobbyOpen, onGiveawayOpen }: RoomFooterProps) {
    const { 
        isConnected, 
        isConnecting,
        joinVoice, 
        leaveVoiceOnly,
        self, 
        toggleSelfMute,
        isSpeakerMuted,
        toggleSpeakerMute,
    } = useVoiceChat();
    const { user, userData } = useAuth();
    const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
    const [isInputExpanded, setIsInputExpanded] = useState(false);
    
    const isHost = user?.uid === room?.createdBy.uid;
    const isAdmin = userData?.role === 'admin';
    const isEventRoom = room.type === 'event';
    
    const canJoinToSpeak = !isEventRoom || (isEventRoom && (isHost || isAdmin));

    return (
        <>
            <footer className={cn("sticky bottom-0 left-0 right-0 z-10 p-2 border-t", isEventRoom ? 'bg-black/20' : 'bg-background/80 backdrop-blur-sm')}>
                <div className="flex w-full items-center space-x-2">
                     <AnimatePresence>
                        {!isInputExpanded && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                className="flex items-center gap-1"
                             >
                                {!isEventRoom && (
                                    <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0" onClick={() => setIsGiftPanelOpen(true)}>
                                        <Gift className="h-6 w-6 text-primary" />
                                    </Button>
                                )}

                                {canJoinToSpeak && (
                                    <>
                                        {isConnected ? (
                                             <>
                                                <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                                    {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5" />}
                                                </Button>
                                                <Button onClick={leaveVoiceOnly} variant="destructive" size="icon" className="rounded-full flex-shrink-0">
                                                    <PhoneOff className="h-5 w-5"/>
                                                </Button>
                                            </>
                                        ) : (
                                             <Button onClick={() => joinVoice({ muted: true })} disabled={isConnecting} className="rounded-full font-semibold px-4 bg-gradient-to-r from-red-500 to-blue-600 text-white shadow-lg hover:scale-105 transition-transform shrink-0">
                                                {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
                                                Sese Katıl
                                            </Button>
                                        )}
                                    </>
                                )}
                             </motion.div>
                        )}
                    </AnimatePresence>

                    <ChatMessageInput 
                        room={room} 
                        isExpanded={isInputExpanded}
                        onFocus={() => setIsInputExpanded(true)}
                        onBlur={() => setIsInputExpanded(false)}
                    />
                </div>
            </footer>
             <GiftPanel 
                isOpen={isGiftPanelOpen}
                onOpenChange={setIsGiftPanelOpen}
                room={room}
            />
        </>
    );
}
