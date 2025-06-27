// src/components/profile/ProfileViewerList.tsx
'use client';

import { useEffect, useState } from 'react';
import { getProfileViewers } from '@/lib/actions/profileActions';
import type { ProfileViewer } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, EyeOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

export default function ProfileViewerList() {
    const { user } = useAuth();
    const [viewers, setViewers] = useState<ProfileViewer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getProfileViewers(user.uid)
                .then(setViewers)
                .finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) {
        return <div className="flex justify-center items-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (viewers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <EyeOff className="h-10 w-10 mb-2"/>
                <p className="font-semibold">Henüz kimse profilini ziyaret etmedi.</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 pt-2">
            {viewers.map((viewer) => (
                <div key={viewer.uid} className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted">
                    <Link href={`/profile/${viewer.uid}`} className="flex items-center gap-3 group flex-1">
                        <Avatar className="h-11 w-11">
                            <AvatarImage src={viewer.photoURL || undefined} />
                            <AvatarFallback>{viewer.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                             <p className="font-semibold group-hover:underline">{viewer.username}</p>
                             <p className="text-xs text-muted-foreground">{formatDistanceToNow(viewer.viewedAt.toDate(), { addSuffix: true, locale: tr })}</p>
                        </div>
                    </Link>
                </div>
            ))}
        </div>
    );
}
