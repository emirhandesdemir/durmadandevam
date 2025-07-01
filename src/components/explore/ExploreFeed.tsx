// src/components/explore/ExploreFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getExploreProfiles } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { Loader2, Compass } from 'lucide-react';
import ExploreProfileCard from './ExploreProfileCard';

export default function ExploreFeed() {
    const { user } = useAuth();
    const [profiles, setProfiles] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getExploreProfiles(user.uid)
                .then(setProfiles)
                .finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) {
        return <div className="h-full flex items-center justify-center text-white"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (profiles.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center text-white/70 p-4">
                <Compass className="h-16 w-16 mb-4"/>
                <h2 className="text-xl font-bold text-white">Keşfedilecek Profil Yok</h2>
                <p>Görünüşe göre henüz fotoğraf paylaşan kimse yok. Topluluk büyüdükçe burayı tekrar kontrol et!</p>
            </div>
        );
    }
    
    return (
        <div className="h-full w-full overflow-y-auto snap-y snap-mandatory">
            {profiles.map(profile => (
                <div key={profile.uid} className="h-full w-full snap-start shrink-0">
                    <ExploreProfileCard profile={profile} />
                </div>
            ))}
        </div>
    );
}
