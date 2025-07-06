// src/components/rooms/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, Loader2, ScreenShareOff, ScreenShare, Music, Camera, CameraOff, SwitchCamera, Gamepad2, Gift } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import MusicPlayerDialog from '../voice/MusicPlayerDialog';
import { useAuth } from '@/contexts/AuthContext';


interface RoomFooterProps {
    room: Room;
    onGameLobbyOpen: () => void;
    onGiveawayOpen: () => void;
}

export default function RoomFooter({ room, onGameLobbyOpen, onGiveawayOpen }: RoomFooterProps) {
    const { 
        isConnected, 
        isConnecting, 
        joinRoom, 
        self, 
        toggleSelfMute,
        isSharingScreen,
        startScreenShare,
        stopScreenShare,
        isSharingVideo,
        startVideo,
        stopVideo,
        switchCamera,
    } = useVoiceChat();
    const { user } = useAuth();
    const [showVideoConfirm, setShowVideoConfirm] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    
    const isHost = user?.uid === room?.createdBy.uid;

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

    return (
        <>
            <footer className="sticky bottom-0 left-0 right-0 z-10 bg-background/80 backdrop-blur-sm border-t p-2">
                <div className="flex w-full items-center space-x-2">
                    <ChatMessageInput room={room} />
                    
                    {isConnected ? (
                        <>
                            <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5" />}
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                        <Settings className="h-5 w-5" />
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent align="end" side="top" className="w-auto p-2">
                                    <div className="flex items-center gap-1 bg-background rounded-full">
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
                                        {isHost && room.type === 'event' && (
                                            <Button onClick={onGiveawayOpen} variant="ghost" size="icon" className="rounded-full text-primary">
                                                <Gift />
                                            </Button>
                                        )}
                                    </div>
                                </PopoverContent>
                            </Popover>
                        </>
                    ) : (
                         <Button onClick={() => joinRoom()} disabled={isConnecting} className="rounded-full font-semibold px-4 bg-gradient-to-r from-red-500 to-blue-600 text-white shadow-lg hover:scale-105 transition-transform shrink-0">
                            {isConnecting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Mic className="mr-2 h-5 w-5" />}
                            Sese Katıl
                        </Button>
                    )}
                </div>
            </footer>
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
