// src/components/voice/RoomFooter.tsx
'use client';

import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Mic, MicOff, Settings, LogOut, Loader2, ScreenShareOff, ScreenShare, Music, Camera, CameraOff, SwitchCamera } from 'lucide-react';
import ChatMessageInput from '../chat/ChatMessageInput';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useState } from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import MusicPlayerDialog from '../voice/MusicPlayerDialog';


interface RoomFooterProps {
    room: Room;
    onGameLobbyOpen: () => void;
}

export default function RoomFooter({ room, onGameLobbyOpen }: RoomFooterProps) {
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
        isSharingVideo,
        startVideo,
        stopVideo,
        switchCamera,
    } = useVoiceChat();
    const [showVideoConfirm, setShowVideoConfirm] = useState(false);
    const [isMusicPlayerOpen, setIsMusicPlayerOpen] = useState(false);
    
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
                    <ChatMessageInput roomId={room.id} canSendMessage={isParticipant} />
                    <Button onClick={toggleSelfMute} variant="secondary" size="icon" className="rounded-full flex-shrink-0" disabled={!isConnected}>
                        {self?.isMuted ? <MicOff className="h-5 w-5 text-destructive"/> : <Mic className="h-5 w-5" />}
                    </Button>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="secondary" size="icon" className="rounded-full flex-shrink-0">
                                <Settings className="h-5 w-5" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" side="top" className="w-auto p-2 space-y-2">
                            <div className="flex items-center gap-1 bg-background rounded-full">
                                <Button onClick={handleJoinLeave} variant="secondary" className="rounded-full px-4" disabled={isConnecting}>
                                    {isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : isConnected ? <><LogOut className="mr-2 h-4 w-4"/>Ayrıl</> : 'Katıl'}
                                </Button>
                                <Button onClick={handleVideoToggle} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                {isSharingVideo ? <CameraOff className="text-destructive"/> : <Camera />}
                                </Button>
                                <Button onClick={switchCamera} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected || !isSharingVideo}>
                                    <SwitchCamera />
                                </Button>
                                <Button onClick={handleScreenShare} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                {isSharingScreen ? <ScreenShareOff className="text-destructive"/> : <ScreenShare />}
                                </Button>
                                <Button onClick={handleMusicButtonClick} variant="ghost" size="icon" className="rounded-full" disabled={!isConnected}>
                                    <Music />
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>

                </div>
            </footer>
             <MusicPlayerDialog 
                isOpen={isMusicPlayerOpen}
                onOpenChange={setIsMusicPlayerOpen}
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
