'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, MapPin, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';

// Mock data structure - replace with actual data fetching
interface NearbyUser {
  uid: string;
  username: string;
  photoURL: string | null;
  distance: number; // in kilometers
}

// Mock function to simulate fetching nearby users
const fetchNearbyUsers = async (location: GeolocationCoordinates): Promise<NearbyUser[]> => {
  // In a real app, you would send location to your backend
  // and query a geospatial database like Firestore with GeoFire.
  console.log("Fetching users near:", location.latitude, location.longitude);
  await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate network delay
  return [
    { uid: '1', username: 'Ayşe', photoURL: 'https://placehold.co/100x100.png', distance: 0.5 },
    { uid: '2', username: 'Mehmet', photoURL: 'https://placehold.co/100x100.png', distance: 1.2 },
    { uid: '3', username: 'Fatma', photoURL: null, distance: 2.1 },
    { uid: '4', username: 'Ali', photoURL: 'https://placehold.co/100x100.png', distance: 3.5 },
  ].sort((a,b) => a.distance - b.distance);
};


export default function NearbyPage() {
  const { user } = useAuth();
  const [location, setLocation] = useState<GeolocationCoordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError('Tarayıcınız konum servislerini desteklemiyor.');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation(position.coords);
      },
      (err) => {
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Konum izni vermeniz gerekiyor.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Konum bilgisi alınamadı.');
            break;
          case err.TIMEOUT:
            setError('Konum bilgisi alınırken zaman aşımı oldu.');
            break;
          default:
            setError('Bilinmeyen bir hata oluştu.');
            break;
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (location) {
      setLoading(true);
      fetchNearbyUsers(location)
        .then(setNearbyUsers)
        .catch(() => setError('Yakındaki kullanıcılar getirilemedi.'))
        .finally(() => setLoading(false));
    }
  }, [location]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Konumunuz alınıyor ve yakındaki kullanıcılar aranıyor...</p>
        </div>
      );
    }
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Hata</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
        </div>
      );
    }
    if (nearbyUsers.length === 0) {
        return (
             <div className="flex flex-col items-center justify-center gap-4 text-center">
                <MapPin className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-bold">Yakınlarda Kimse Yok</h2>
                <p className="text-muted-foreground max-w-sm">Şu anda yakınlarda kimse bulunmuyor. Daha sonra tekrar kontrol et.</p>
            </div>
        )
    }

    return (
        <div className="w-full max-w-2xl space-y-3">
            {nearbyUsers.map(u => (
                <Link key={u.uid} href={`/profile/${u.uid}`}>
                    <Card className="hover:bg-muted transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-12 w-12">
                                    <AvatarImage src={u.photoURL || undefined} />
                                    <AvatarFallback>{u.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="font-bold">{u.username}</p>
                                    <p className="text-xs text-muted-foreground">{u.distance} km uzakta</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </Link>
            ))}
        </div>
    )

  };
  
  return (
    <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 mb-6">
            <MapPin className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Yakındakileri Keşfet</h1>
        </div>
        <div className="flex-1 flex items-center justify-center">
             {renderContent()}
        </div>
    </div>
  );
}
