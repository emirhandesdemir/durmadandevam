// src/app/(main)/live/start/page.tsx
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Radio, Video, AlertTriangle, Mic, MicOff, Camera, CameraOff, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startLiveStream } from '@/lib/actions/liveActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

  const getMedia = useCallback(async (audio = true, video = true) => {
    try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ 
            video, 
            audio 
        });
        setError(null);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        return mediaStream;
    } catch (err: any) {
        console.error('Error accessing media devices.', err);
        let message = 'Kamera ve mikrofon erişimi reddedildi. Canlı yayın başlatmak için tarayıcı ayarlarından izin vermeniz gerekir.';
        if(err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            message = 'Kamera veya mikrofon bulunamadı.';
        }
        setError(message);
        return null;
    }
  }, []);

  useEffect(() => {
    const init = async () => {
        const s = await getMedia();
        if (s) setStream(s);
    }
    init();

    return () => {
        stream?.getTracks().forEach(track => track.stop());
    }
  }, [getMedia]);

  const toggleMute = () => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(p => !p);
    }
  };

  const toggleCamera = () => {
    if (stream) {
      stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsCameraOn(p => !p);
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
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio /> Canlı Yayın Başlat</CardTitle>
          <CardDescription>Yayınınız için bir başlık belirleyin ve hemen başlayın.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center relative">
            {error ? (
                 <div className="text-center text-destructive p-4">
                    <CameraOff className="h-10 w-10 mx-auto" />
                    <p className="mt-2 font-semibold">Medya Erişimi Gerekli</p>
                    <p className="text-xs max-w-xs">{error}</p>
                </div>
            ) : stream ? (
                <>
                    <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
                    <div className="absolute bottom-2 left-2 right-2 flex justify-center gap-2">
                        <Button onClick={toggleMute} variant="secondary" size="icon" className="rounded-full bg-black/40 text-white hover:bg-black/60"><_config>
  <plugins>
    <plugin name="langchain" />
  </plugins>
</config>
