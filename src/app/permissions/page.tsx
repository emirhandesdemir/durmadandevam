// src/app/permissions/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateUserLocation } from '@/lib/actions/userActions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, MapPin, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function PermissionsPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'idle' | 'requesting' | 'done'>('idle');
  const [locationGranted, setLocationGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);

  const handleRequestPermissions = async () => {
    setStatus('requesting');
    
    // Request Microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // We don't need to use the stream, just ask for permission. We should stop the tracks immediately.
      stream.getTracks().forEach(track => track.stop());
      setMicGranted(true);
    } catch (err) {
      console.warn('Microphone permission denied:', err);
      // It's not a critical error if they deny, they can grant it later.
      setMicGranted(false);
    }

    // Request Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (user) {
            // Note: Reverse geocoding to get city/country would happen here
            // if we had a geocoding API. We are skipping that for now
            // and just storing lat/lon.
            await updateUserLocation(user.uid, position.coords.latitude, position.coords.longitude);
            setLocationGranted(true);
          }
          setStatus('done');
          router.push('/onboarding');
        },
        (error) => {
          console.warn('Location permission denied:', error);
          toast({
            variant: 'destructive',
            title: 'Konum İzni Reddedildi',
            description: 'Yakındaki kişileri bulma özelliği çalışmayacak. Ayarlardan daha sonra izin verebilirsiniz.',
          });
          setLocationGranted(false);
          setStatus('done');
          router.push('/onboarding');
        }
      );
    } else {
      toast({
        variant: 'destructive',
        title: 'Konum Desteklenmiyor',
        description: 'Tarayıcınız konum servislerini desteklemiyor.',
      });
      setStatus('done');
      router.push('/onboarding');
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md animate-in zoom-in-95">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Son Bir Adım!</CardTitle>
          <CardDescription>Uygulamanın tüm özelliklerinden yararlanmak için lütfen gerekli izinleri verin.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                    <MapPin className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-semibold">Konum İzni</p>
                        <p className="text-xs text-muted-foreground">Yakındaki kişileri keşfetmek için kullanılır.</p>
                    </div>
                </div>
                {locationGranted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
             <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                    <Mic className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-semibold">Mikrofon İzni</p>
                        <p className="text-xs text-muted-foreground">Sesli sohbet odalarına katılmak için kullanılır.</p>
                    </div>
                </div>
                 {micGranted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
            </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleRequestPermissions} disabled={status !== 'idle'}>
            {status === 'requesting' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'done' ? 'Devam Et...' : 'İzinleri Ver ve Devam Et'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
