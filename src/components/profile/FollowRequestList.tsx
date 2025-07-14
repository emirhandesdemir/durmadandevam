// src/components/profile/FollowRequestList.tsx
'use client';

import { useState } from 'react';
import type { FollowRequest, UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { handleFollowRequest } from '@/lib/actions/followActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';

interface FollowRequestListProps {
  requests: FollowRequest[];
}

export default function FollowRequestList({ requests }: FollowRequestListProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const handleAction = async (requesterId: string, action: 'accept' | 'deny') => {
        if (!user) return;
        setProcessingId(requesterId);
        try {
            await handleFollowRequest(user.uid, requesterId, action);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setProcessingId(null);
        }
    };

    if (requests.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Bekleyen takip isteği yok.</p>;
    }

    return (
        <div className="space-y-1">
            {requests.map((request) => (
                <div key={request.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <Link href={`/profile/${request.uid}`} className="flex items-center gap-3 group">
                        <div className={cn("avatar-frame-wrapper", request.userAvatarFrame)}>
                             <Avatar className="relative z-[1] h-10 w-10">
                                <AvatarImage src={request.photoURL || undefined} />
                                <AvatarFallback>{request.profileEmoji || request.username.charAt(0)}</AvatarFallback>
                            </Avatar>
                        </div>
                       <div>
                         <span className="font-semibold group-hover:underline">{request.username}</span>
                         <p className="text-xs text-muted-foreground">{formatDistanceToNow((request.requestedAt as Timestamp).toDate(), { addSuffix: true, locale: tr })}</p>
                       </div>
                    </Link>
                    <div className="flex gap-2">
                        {processingId === request.uid ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                            <>
                                <Button size="sm" onClick={() => handleAction(request.uid, 'accept')}>Onayla</Button>
                                <Button size="sm" variant="outline" onClick={() => handleAction(request.uid, 'deny')}>Reddet</Button>
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
