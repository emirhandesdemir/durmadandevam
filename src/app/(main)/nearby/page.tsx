// src/app/(main)/nearby/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, MapPin, LocateFixed, ArrowLeft, ShieldOff, Frown } from 'lucide-react';
import { getNearbyUsers, updateUserLocation } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { ScrollArea } from '@/components/ui/scroll-area';
import NearbyUserCard from '@/components/nearby/NearbyUserCard';
import Link from 'next/link';

// NearbyUser arayüzünü UserProfile'dan genişletelim, konum zorunlu olsun.
export interface NearbyUser extends UserProfile {
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function NearbyPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const [status, setStatus] = useState<'idle' | 'requesting' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  const handleAllowLocation = () => {
    setStatus('requesting');
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        if (user) {
          try {
            await updateUserLocation(user.uid, latitude, longitude);
            const users = await getNearbyUsers(user.uid, latitude, longitude, 50); // 50km radius
            setNearbyUsers(users as NearbyUser[]);
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
  
    // Profil bilgileri eksikse bu sayfayı gösterme.
  if (userData && (!userData.gender || !userData.age || !userData.city)) {
     return (
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
             <ShieldOff className="mx-auto h-12 w-12 text-destructive" />
            <h2 className="mt-4 text-2xl font-bold">Profil Bilgileri Eksik</h2>
            <p className="mt-2 text-muted-foreground max-w-sm">
                "Yakınımdakiler" özelliğini kullanabilmek için profilinizde cinsiyet, yaş ve şehir bilgilerinizin eksiksiz olması gerekmektedir.
            </p>
             <Button asChild className="mt-6">
                <Link href="/profile">Profili Düzenle</Link>
            </Button>
        </div>
    )
  }


  const renderContent = () => {
    switch (status) {
      case 'success':
        return (
          <ScrollArea className="h-full w-full">
            <div className="p-2 md:p-4 space-y-4">
                {nearbyUsers.length > 0 ? (
                    nearbyUsers.map(u => <NearbyUserCard key={u.uid} user={u} />)
                ) : (
                    <div className="text-center py-20 text-muted-foreground">
                        <Frown className="h-12 w-12 mx-auto mb-2" />
                        <p className="font-semibold">Yakınlarda kimse bulunamadı.</p>
                        <p className="text-sm">Daha sonra tekrar kontrol et.</p>
                    </div>
                )}
            </div>
          </ScrollArea>
        );
      case 'requesting':
        return (
          <div className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">Konumunuz alınıyor ve yakınınızdaki kişiler aranıyor...</p>
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
              Konumunuzu paylaşarak yakınınızdaki diğer kullanıcıları keşfedin ve yeni insanlarla tanışın. Konumunuz sadece bu özellik için kullanılacaktır.
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
        <header className="flex items-center p-2 border-b shrink-0">
            <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.back()}>
                <ArrowLeft />
            </Button>
            <h1 className="text-lg font-semibold ml-2">Yakınımdakiler</h1>
        </header>
        <div className="flex-1 flex items-center justify-center bg-muted/20">
             {renderContent()}
        </div>
    </div>
  );
}
