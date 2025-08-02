// src/app/(main)/live/start/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Radio, Video, AlertTriangle, Mic, MicOff, Camera, CameraOff, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startLiveStream } from '@/lib/actions/liveActions';

export default function StartLivePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // This useEffect hook is now the single source of truth for managing the media stream.
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    
    const getMedia = async () => {
      // Clear previous error
      setError(null);
      
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode },
          audio: true,
        });

        currentStream = mediaStream;
        setStream(mediaStream);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }

        // Apply initial mute/camera state
        mediaStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
        mediaStream.getVideoTracks().forEach(track => track.enabled = isCameraOn);
        
      } catch (err: any) {
        console.error('Error accessing media devices.', err);
        let message = 'Kamera ve mikrofon erişimi reddedildi. Canlı yayın başlatmak için tarayıcı ayarlarından izin vermeniz gerekir.';
        if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          message = 'Kamera veya mikrofon bulunamadı.';
        } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          message = 'Canlı yayın başlatmak için kamera ve mikrofon erişimine izin vermelisiniz.';
        }
        setError(message);
        setStream(null);
      }
    };
    
    getMedia();

    // Cleanup function: This will run when the component unmounts OR before the effect runs again.
    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  // Rerun the effect whenever the facingMode changes.
  }, [facingMode]);

  const toggleMute = () => {
    if (stream) {
      const newState = !isMuted;
      stream.getAudioTracks().forEach(track => track.enabled = !newState);
      setIsMuted(newState);
    }
  };

  const toggleCamera = () => {
    if (stream) {
        const newState = !isCameraOn;
        stream.getVideoTracks().forEach(track => track.enabled = newState);
        setIsCameraOn(newState);
    }
  };
  
  const switchCamera = () => {
    if (isCameraOn) {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }
  };

  const handleStartStream = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' });
      return;
    }
    if (!title.trim()) {
      toast({ variant: 'destructive', description: 'Lütfen bir başlık girin.' });
      return;
    }
    if (!stream) {
        toast({ variant: 'destructive', description: 'Canlı yayın için medya erişimi gereklidir.' });
        return;
    }

    setIsLoading(true);
    try {
      const result = await startLiveStream({
        uid: user.uid,
        username: userData.username,
        photoURL: userData.photoURL || null,
      }, title);

      if (result.success && result.liveId) {
        // Stop the local stream before navigating away
        stream.getTracks().forEach(track => track.stop());
        toast({ description: 'Canlı yayın başlatılıyor...' });
        router.replace(`/live/${result.liveId}`);
      } else {
        throw new Error(result.error || 'Canlı yayın başlatılamadı.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full bg-black text-white">
      <div className="relative w-full h-full flex flex-col justify-between p-4">
        {/* Video Preview */}
        <div className="absolute inset-0 w-full h-full -z-10">
          {error ? (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900 text-center p-4">
                  <CameraOff className="h-16 w-16 text-muted-foreground" />
                  <p className="mt-4 font-semibold text-lg">Kamera Erişimi Gerekli</p>
                  <p className="text-sm text-muted-foreground max-w-xs">{error}</p>
                   <Button onClick={() => setFacingMode(f => f)} className="mt-4">Tekrar Dene</Button>
              </div>
          ) : (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
          )}
        </div>
        
        {/* Header - Empty for full screen video */}
        <div></div>

        {/* Footer Controls */}
        <div className="z-10 space-y-4">
           <div className="space-y-1">
                <Label htmlFor="title" className="text-white/80 font-semibold">Yayın Başlığı</Label>
                <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Yayınınız için ilgi çekici bir başlık girin..."
                    className="bg-black/50 border-white/30 text-white placeholder:text-white/50 h-12 text-base"
                />
            </div>
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2 p-1.5 rounded-full bg-black/40 backdrop-blur-sm">
              <Button onClick={toggleMute} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20">
                {isMuted ? <MicOff /> : <Mic />}
              </Button>
              <Button onClick={toggleCamera} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20">
                {isCameraOn ? <Camera /> : <CameraOff />}
              </Button>
              <Button onClick={switchCamera} variant="ghost" size="icon" className="rounded-full h-12 w-12 text-white hover:bg-white/20" disabled={!isCameraOn}>
                <SwitchCamera />
              </Button>
            </div>
             <Button
                onClick={handleStartStream}
                disabled={isLoading || !!error || !title.trim()}
                className="h-14 rounded-full font-bold px-8 text-lg bg-red-600 hover:bg-red-700 text-white shadow-lg"
              >
                {isLoading ? <Loader2 className="animate-spin" /> : 'Canlı Yayına Geç'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
