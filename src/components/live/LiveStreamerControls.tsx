// src/components/live/LiveStreamerControls.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Camera, CameraOff, SwitchCamera, LogOut, Users, Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface LiveStreamerControlsProps {
    isMuted: boolean;
    isCameraOn: boolean;
    isEnding: boolean;
    onToggleMute: () => void;
    onToggleCamera: () => void;
    onSwitchCamera: () => void;
    onEndStream: () => void;
    onShowParticipants: () => void;
}

export default function LiveStreamerControls({
    isMuted, isCameraOn, isEnding, onToggleMute, onToggleCamera, onSwitchCamera, onEndStream, onShowParticipants
}: LiveStreamerControlsProps) {
    const [showEndConfirm, setShowEndConfirm] = useState(false);

    return (
        <>
            <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-between items-center">
                <div className="flex gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                    <Button onClick={onToggleMute} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20">
                        {isMuted ? <MicOff /> : <Mic />}
                    </Button>
                    <Button onClick={onToggleCamera} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20">
                        {isCameraOn ? <Camera /> : <CameraOff />}
                    </Button>
                    <Button onClick={onSwitchCamera} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20" disabled={!isCameraOn}>
                        <SwitchCamera />
                    </Button>
                </div>
                <div className="flex gap-2">
                    <Button onClick={onShowParticipants} variant="secondary" className="rounded-full bg-black/40 backdrop-blur-sm text-white hover:bg-white/20">
                        <Users className="mr-2 h-4 w-4"/> Katılımcılar
                    </Button>
                    <Button onClick={() => setShowEndConfirm(true)} variant="destructive" className="rounded-full font-semibold" disabled={isEnding}>
                         {isEnding ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
                        Yayını Bitir
                    </Button>
                </div>
            </div>
             <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Yayını Sonlandır</AlertDialogTitle>
                        <AlertDialogDescription>
                           Canlı yayını sonlandırmak istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={onEndStream} className="bg-destructive hover:bg-destructive/90">
                            Evet, Sonlandır
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}