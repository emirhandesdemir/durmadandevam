// src/components/voice/VoiceStatusPanel.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { Button } from '../ui/button';
import { Mic, MicOff, Camera, CameraOff, Wifi, WifiOff, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';

interface VoiceStatusPanelProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const AudioVisualizer = () => {
    const { localStream } = useVoiceChat();
    const [volume, setVolume] = useState(0);
    const animationFrameRef = useRef<number>();

    useEffect(() => {
        if (!localStream) {
            setVolume(0);
            return;
        }
        
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(localStream);
        
        source.connect(analyser);
        analyser.fftSize = 256;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const draw = () => {
            animationFrameRef.current = requestAnimationFrame(draw);
            analyser.getByteTimeDomainData(dataArray);
            
            let sumSquares = 0.0;
            for (const amplitude of dataArray) {
                const val = (amplitude / 128.0) - 1.0;
                sumSquares += val * val;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);
            setVolume(rms * 100);
        };
        draw();
        
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            audioContext.close();
        };
    }, [localStream]);

    return (
         <div className="w-full bg-muted rounded-lg p-2 flex items-center gap-2">
            <Mic className="text-muted-foreground" />
            <Progress value={volume} className="w-full h-2"/>
        </div>
    );
}


const StatusItem = ({ label, status, icon: Icon, okColor = 'text-green-500' }: { label: string, status: boolean, icon: React.ElementType, okColor?: string }) => (
    <div className="flex items-center justify-between">
        <p className="font-medium text-sm">{label}</p>
        <div className={cn("flex items-center gap-1.5 text-sm font-semibold", status ? okColor : 'text-destructive')}>
            <Icon className="h-4 w-4" />
            <span>{status ? 'İzin Verildi' : 'Engellendi'}</span>
        </div>
    </div>
)

export default function VoiceStatusPanel({ isOpen, onOpenChange }: VoiceStatusPanelProps) {
  const {
    micPermission,
    camPermission,
    connectionState,
    isConnecting,
    isConnected,
  } = useVoiceChat();

  let statusText = 'Bağlı Değil';
  let statusColor = 'text-muted-foreground';
  if (isConnecting) {
      statusText = 'Bağlanıyor...';
      statusColor = 'text-amber-500';
  } else if (isConnected) {
      statusText = 'Bağlandı';
      statusColor = 'text-green-500';
  } else if (connectionState === 'failed') {
      statusText = 'Bağlantı Başarısız';
      statusColor = 'text-destructive';
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ses ve Bağlantı Durumu</DialogTitle>
          <DialogDescription>
            Mevcut sesli sohbet bağlantınızın detayları.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div>
                 <h4 className="text-sm font-semibold mb-2">Mikrofon Testi</h4>
                 <AudioVisualizer />
                 <p className="text-xs text-muted-foreground mt-1">Konuştuğunuzda çubuğun hareket ettiğinden emin olun.</p>
            </div>
            
            <Separator />

            <div>
                 <h4 className="text-sm font-semibold mb-2">İzinler</h4>
                <div className="space-y-2">
                    <StatusItem label="Mikrofon İzni" status={micPermission === 'granted'} icon={micPermission === 'granted' ? CheckCircle2 : micPermission === 'denied' ? XCircle : AlertCircle} />
                    <StatusItem label="Kamera İzni" status={camPermission === 'granted'} icon={camPermission === 'granted' ? CheckCircle2 : camPermission === 'denied' ? XCircle : AlertCircle} />
                </div>
            </div>

             <Separator />
            
            <div>
                 <h4 className="text-sm font-semibold mb-2">Bağlantı</h4>
                <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">Oda Bağlantısı</p>
                    <p className={cn("text-sm font-semibold", statusColor)}>{statusText}</p>
                </div>
                 <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">WebRTC Durumu</p>
                    <p className="text-sm font-semibold text-muted-foreground capitalize">{connectionState}</p>
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
