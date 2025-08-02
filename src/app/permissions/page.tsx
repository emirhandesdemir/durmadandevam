// src/app/permissions/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { updateUserLocation, saveFCMToken } from '@/lib/actions/userActions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Mic, MapPin, CheckCircle2, Bell } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { messaging } from '@/lib/firebase';
import { getToken } from 'firebase/messaging';

export default function PermissionsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<'idle' | 'requesting' | 'done'>('idle');
  const [locationGranted, setLocationGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);

  // VAPID anahtarını ortam değişkenlerinden almak en iyisidir, ancak burada doğrudan kullanıyoruz.
  const vapidKey = "BEv3RhiBuZQ8cDg2SAQf41tY_ijOEBJyCDLUY648St78CRgE57v8HWYUDBu6huI_kxzF_gKyelZi3Qbfgs8PMaE";

  const handleRequestPermissions = async () => {
    setStatus('requesting');
    let allPermissionsHandled = true;

    // 1. Request Microphone
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicGranted(true);
    } catch (err) {
      console.warn('Microphone permission denied:', err);
      setMicGranted(false);
    }

    // 2. Request Notifications
    if ('Notification' in window && messaging) {
        try {
            const permission = await Notification.requestPermission();
            if (permission === 'granted' && user) {
                const currentToken = await getToken(messaging, { vapidKey });
                if (currentToken) {
                    await saveFCMToken(user.uid, currentToken);
                }
                setNotificationGranted(true);
            } else {
                setNotificationGranted(false);
            }
        } catch (error) {
            console.error('Notification permission error:', error);
            setNotificationGranted(false);
        }
    }

    // 3. Request Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (user) {
            await updateUserLocation(user.uid, position.coords.latitude, position.coords.longitude);
            setLocationGranted(true);
          }
        },
        (error) => {
          console.warn('Location permission denied:', error);
          setLocationGranted(false);
          toast({
            variant: 'destructive',
            title: 'Konum İzni Reddedildi',
            description: 'Yakındaki kişileri bulma özelliği çalışmayacak. Ayarlardan daha sonra izin verebilirsiniz.',
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
        toast({
            variant: 'destructive',
            title: 'Konum Desteklenmiyor',
            description: 'Tarayıcınız konum servislerini desteklemiyor.',
        });
        allPermissionsHandled = false;
    }
    
    // Always move to the next step
    setStatus('done');
    router.push('/onboarding');
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
             <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="flex items-center gap-3">
                    <Bell className="h-6 w-6 text-primary" />
                    <div>
                        <p className="font-semibold">Bildirim İzni</p>
                        <p className="text-xs text-muted-foreground">Mesajları ve önemli güncellemeleri kaçırmayın.</p>
                    </div>
                </div>
                 {notificationGranted && <CheckCircle2 className="h-5 w-5 text-green-500" />}
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
