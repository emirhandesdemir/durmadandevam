// src/components/rooms/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, Loader2, ScreenShareOff, ScreenShare, Music, Camera, CameraOff, SwitchCamera, Gamepad2, Gift, BrainCircuit, Volume2, VolumeX, MoreHorizontal, PhoneOff } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import MusicPlayerDialog from '../voice/MusicPlayerDialog';
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
        isListening,
        joinToSpeak, 
        leaveVoice,
        self, 
        toggleSelfMute,
        isSpeakerMuted,
        toggleSpeakerMute,
        isSharingScreen,
        startScreenShare,
        stopScreenShare,
        isSharingVideo,
        startVideo,
        stopVideo,
        switchCamera,
    } = useVoiceChat();
    const { user, userData } = useAuth();
    const [showVideoConfirm, setShowVideoConfirm] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    const [isGiftPanelOpen, setIsGiftPanelOpen] = useState(false);
    const [isInputExpanded, setIsInputExpanded] = useState(false);

    
    const isHost = user?.uid === room?.createdBy.uid;
    const isAdmin = userData?.role === 'admin';
    const isEventRoom = room.type === 'event';


    const handleScreenShare = () => {
        if (isSharingScreen) {
            stopScreenShare();
        } else {
            startScreenShare();
        }
    };

    const handleVideoToggle = () => {
        if (isSharingVideo) {
            stopVideo();
        } else {
            setShowVideoConfirm(true);
        }
    }

    const handleMusicButtonClick = () => {
        setIsMusicPlayerOpen(true);
    };

    const handleStartMindWar = () => {
        onGameLobbyOpen();
    }
    
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
                                        {!isConnected && (
                                            <Button onClick={() => joinToSpeak()} disabled={isConnecting} className="rounded-full font-semibold px-4 bg-gradient-to-r from-red-500 to-blue-600 text-white shadow-lg hover:scale-105 transition-transform shrink-0">
                                                {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
                                                Konuşmak İçin Katıl
                                            </Button>
                                        )}

                                        {isConnected && (
                                            <>
                                                <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                                    {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5" />}
                                                </Button>
                                                <Button onClick={leaveVoice} variant="destructive" size="icon" className="rounded-full flex-shrink-0">
                                                    <PhoneOff className="h-5 w-5"/>
                                                </Button>
                                                
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                                            <MoreHorizontal className="h-5 w-5" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent align="end" side="top" className="w-auto p-2">
                                                        <div className="flex items-center gap-1 bg-background rounded-full">
                                                            <Button onClick={toggleSpeakerMute} variant="ghost" size="icon" className="rounded-full flex-shrink-0">
                                                                {isSpeakerMuted ? <VolumeX className="h-5 w-5"/> : <Volume2 className="h-5 w-5" />}
                                                            </Button>
                                                            <Button onClick={handleVideoToggle} variant="ghost" size="icon" className="rounded-full">
                                                                {isSharingVideo ? <CameraOff className="text-destructive"/> : <Camera />}
                                                            </Button>
                                                            <Button onClick={switchCamera} variant="ghost" size="icon" className="rounded-full" disabled={!isSharingVideo}>
                                                                <SwitchCamera />
                                                            </Button>
                                                            <Button onClick={handleScreenShare} variant="ghost" size="icon" className="rounded-full">
                                                                {isSharingScreen ? <ScreenShareOff className="text-destructive"/> : <ScreenShare />}
                                                            </Button>
                                                            <Button onClick={handleMusicButtonClick} variant="ghost" size="icon" className="rounded-full">
                                                                <Music />
                                                            </Button>
                                                            <Button onClick={onGameLobbyOpen} variant="ghost" size="icon" className="rounded-full">
                                                                <BrainCircuit />
                                                            </Button>
                                                            {isHost && (
                                                                <Button onClick={onGiveawayOpen} variant="ghost" size="icon" className="rounded-full text-yellow-400">
                                                                    <Gift />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            </>
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
            <MusicPlayerDialog 
                isOpen={isMusicPlayerOpen}
                onOpenChange={setIsMusicPlayerOpen}
                roomId={room.id}
            />
            <AlertDialog open={showVideoConfirm} onOpenChange={setShowVideoConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Kamerayı Aç?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Görüntünüz odadaki herkesle paylaşılacak. Devam etmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            startVideo();
                            setShowVideoConfirm(false);
                        }}>
                            Evet, Kamerayı Aç
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
