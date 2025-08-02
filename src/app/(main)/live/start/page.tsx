// src/app/(main)/live/start/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Radio, Camera, Video, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startLiveStream } from '@/lib/actions/liveActions';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function StartLivePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const getCameraPermission = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setHasCameraPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        // Stop tracks immediately after checking to free up camera
        stream.getTracks().forEach(track => track.stop());
      } catch (error) {
        console.error('Error accessing camera:', error);
        setHasCameraPermission(false);
      }
    };

    getCameraPermission();
  }, []);

  const handleStartStream = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' });
      return;
    }
    if (!title.trim()) {
      toast({ variant: 'destructive', description: 'Lütfen bir başlık girin.' });
      return;
    }
    if (!hasCameraPermission) {
        toast({ variant: 'destructive', description: 'Canlı yayın için kamera izni gereklidir.' });
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
           <div className="aspect-video w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center">
            {hasCameraPermission === null ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : hasCameraPermission === true ? (
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay muted playsInline />
            ) : (
                <div className="text-center text-destructive p-4">
                    <Camera className="h-10 w-10 mx-auto" />
                    <p className="mt-2 font-semibold">Kamera Erişimi Gerekli</p>
                    <p className="text-xs">Canlı yayın başlatmak için tarayıcı ayarlarından kamera izni vermeniz gerekir.</p>
                </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Yayın Başlığı</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Örn: Soru-cevap yapıyoruz!" 
              disabled={isLoading || !hasCameraPermission}
            />
          </div>
            {hasCameraPermission === false && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>İzin Hatası</AlertTitle>
                    <AlertDescription>
                        Kamera ve mikrofon izni olmadan canlı yayın başlatamazsınız. Lütfen tarayıcı ayarlarınızı kontrol edin.
                    </AlertDescription>
                </Alert>
            )}
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleStartStream} disabled={isLoading || !hasCameraPermission}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
            Canlı Yayına Geç
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
