'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2, AlertTriangle, MapPin } from 'lucide-react';

// Dynamically import the map component to prevent SSR issues
const NearbyMap = dynamic(() => import('@/components/nearby/NearbyMap'), {
  ssr: false,
  loading: () => <div className="flex h-full w-full items-center justify-center bg-muted"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

// Mock data structure - replace with actual data fetching
export interface NearbyUser {
  uid: string;
  username: string;
  photoURL: string | null;
  position: [number, number]; // [latitude, longitude]
}

// Mock function to simulate fetching nearby users
const fetchNearbyUsers = async (location: GeolocationCoordinates): Promise<NearbyUser[]> => {
  // In a real app, you would send location to your backend
  // and query a geospatial database like Firestore with GeoFire.
  console.log("Fetching users near:", location.latitude, location.longitude);
  await new Promise(resolve => setTimeout(resolve, 1500)); 
  
  // Return mock users scattered around the user's location
  return [
    { uid: '1', username: 'Ayşe', photoURL: 'https://placehold.co/100x100.png', position: [location.latitude + 0.005, location.longitude - 0.005] },
    { uid: '2', username: 'Mehmet', photoURL: 'https://placehold.co/100x100.png', position: [location.latitude - 0.002, location.longitude + 0.008] },
    { uid: '3', username: 'Fatma', photoURL: null, position: [location.latitude + 0.008, location.longitude + 0.003] },
  ];
};


export default function NearbyPage() {
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
            setError('Yakındaki kullanıcıları görmek için konum izni vermeniz gerekiyor.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Konum bilgisi şu anda alınamıyor.');
            break;
          case err.TIMEOUT:
            setError('Konum bilgisi alınırken zaman aşımı oldu.');
            break;
          default:
            setError('Konum alınırken bilinmeyen bir hata oluştu.');
            break;
        }
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (location) {
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
          <p className="text-muted-foreground">Konumunuz alınıyor ve harita yükleniyor...</p>
        </div>
      );
    }
    if (error) {
       return (
        <div className="flex flex-col items-center justify-center gap-4 text-center p-4">
          <AlertTriangle className="h-12 w-12 text-destructive" />
          <h2 className="text-xl font-bold">Hata</h2>
          <p className="text-muted-foreground max-w-sm">{error}</p>
        </div>
      );
    }
    if (location) {
        return <NearbyMap currentUserPosition={[location.latitude, location.longitude]} users={nearbyUsers} />;
    }

    return null;
  };
  
  return (
    <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 mb-4 shrink-0">
            <MapPin className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">Yakındakileri Keşfet</h1>
        </div>
        <div className="flex-1 flex items-center justify-center rounded-xl overflow-hidden">
             {renderContent()}
        </div>
    </div>
  );
}
