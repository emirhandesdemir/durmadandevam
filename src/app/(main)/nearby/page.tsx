// src/app/(main)/nearby/page.tsx
'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, LocateFixed, ArrowLeft } from 'lucide-react';
import { updateUserLocation, getNearbyUsers } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';

const NearbyMap = dynamic(() => import('@/components/nearby/NearbyMap'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

export interface NearbyUser extends Pick<UserProfile, 'uid' | 'username' | 'photoURL'> {
  position: [number, number];
}

export default function NearbyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  const handleAllowLocation = () => {
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setPosition([latitude, longitude]);
        if (user) {
          try {
            await updateUserLocation(user.uid, latitude, longitude);
            const users = await getNearbyUsers(user.uid, latitude, longitude);
            setNearbyUsers(users);
            setStatus('success');
          } catch (serverError: any) {
            setStatus('error');
            setError(serverError.message);
          }
        }
      },
      (err) => {
        setStatus('error');
        if (err.code === err.PERMISSION_DENIED) {
          setError('Konum izni reddedildi. Bu özelliği kullanmak için tarayıcı ayarlarından izin vermeniz gerekir.');
        } else {
          setError(`Konum alınamadı: ${err.message}`);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const renderContent = () => {
    switch (status) {
      case 'success':
        return position ? <NearbyMap currentUserPosition={position} users={nearbyUsers} /> : null;
      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Konumunuz alınıyor...</p>
          </div>
        );
      case 'error':
        return (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <h3 className="font-bold text-destructive">Bir Hata Oluştu</h3>
            <p className="mt-2 text-sm text-muted-foreground">{error}</p>
            <Button onClick={handleAllowLocation} className="mt-4">Tekrar Dene</Button>
          </div>
        );
      case 'idle':
      default:
        return (
          <div className="flex flex-col items-center justify-center text-center p-4">
            <MapPin className="h-16 w-16 text-primary" />
            <h2 className="mt-4 text-2xl font-bold">Yakındaki Kişileri Keşfet</h2>
            <p className="mt-2 max-w-sm text-muted-foreground">
              Konumunuzu paylaşarak yakınınızdaki diğer kullanıcıları haritada görün ve yeni insanlarla tanışın. Konumunuz sadece bu özellik için kullanılacaktır.
            </p>
            <Button onClick={handleAllowLocation} className="mt-6">
              <LocateFixed className="mr-2 h-4 w-4" />
              Konumuma İzin Ver
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
        <header className="absolute top-0 left-0 z-10 p-4">
            <Button variant="ghost" size="icon" className="rounded-full bg-background/60 backdrop-blur-sm" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
        </header>
        <div className="flex-1 flex items-center justify-center">
             {renderContent()}
        </div>
    </div>
  );
}
