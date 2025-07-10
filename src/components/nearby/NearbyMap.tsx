'use client';

import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';
import type { NearbyUser } from '@/app/(main)/nearby/page';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import Link from 'next/link';

// Fix for default Leaflet icon path in Next.js
const defaultIcon = new L.Icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    shadowSize: [41, 41]
});

// Custom icon for user avatars on the map
const createAvatarIcon = (photoURL: string | null, username: string) => {
    return L.divIcon({
        html: `
            <div style="background-color: white; border-radius: 50%; padding: 3px; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                <img src="${photoURL || `https://placehold.co/50x50.png?text=${username.charAt(0)}`}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" />
            </div>
        `,
        className: 'leaflet-avatar-icon',
        iconSize: [38, 38],
        iconAnchor: [19, 38],
        popupAnchor: [0, -38]
    });
};


interface NearbyMapProps {
  currentUserPosition: [number, number];
  users: NearbyUser[];
}

export default function NearbyMap({ currentUserPosition, users }: NearbyMapProps) {
  return (
    <MapContainer center={currentUserPosition} zoom={14} scrollWheelZoom={true} className="w-full h-full z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />
      {/* Current User Marker */}
      <Marker position={currentUserPosition} icon={defaultIcon}>
        <Popup>Buradasınız</Popup>
      </Marker>

      {/* Nearby Users Markers */}
      {users.map((user) => (
        <Marker key={user.uid} position={user.position} icon={createAvatarIcon(user.photoURL, user.username)}>
          <Popup>
            <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <Link href={`/profile/${user.uid}`} className="font-bold hover:underline">
                    {user.username}
                </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
