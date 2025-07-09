// src/components/admin/BotActivityFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import { getBotActivityLogs } from '@/lib/actions/botActions';
import type { BotActivityLog } from '@/lib/types';
import { Loader2, MessageCircle, Heart, FileUp, UserPlus, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

export default function BotActivityFeed() {
    const [logs, setLogs] = useState<BotActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getBotActivityLogs()
            .then((data) => {
                setLogs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const getActionIcon = (type: BotActivityLog['actionType']) => {
        switch (type) {
            case 'post_image':
            case 'post_text':
            case 'post_video':
                return <FileUp className="h-4 w-4 text-blue-500" />;
            case 'like':
                return <Heart className="h-4 w-4 text-red-500" />;
            case 'comment':
                return <MessageCircle className="h-4 w-4 text-green-600" />;
            case 'follow':
                return <UserPlus className="h-4 w-4 text-purple-500" />;
            case 'dm_sent':
                return <Send className="h-4 w-4 text-indigo-500" />;
            default:
                return null;
        }
    };
    
    const getActionText = (log: BotActivityLog) => {
        switch(log.actionType) {
            case 'post_image': return "bir resim paylaştı.";
            case 'post_text': return "bir metin paylaştı.";
            case 'post_video': return "bir video paylaştı.";
            case 'like': return <>'nin gönderisini beğendi.</>;
            case 'comment': return <>'nin gönderisine yorum yaptı.</>;
            case 'follow': return <>kullanıcısını takip etmeye başladı.</>;
            case 'dm_sent': return <>kullanıcısına bir hoşgeldin mesajı gönderdi.</>;
            default: return "bir eylem gerçekleştirdi."
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if(logs.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">Henüz bot aktivitesi yok.</p>
    }

    return (
        <div className="space-y-4">
            {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3">
                    <div className="mt-1">{getActionIcon(log.actionType)}</div>
                    <div className="flex-1 text-sm">
                        <p>
                            <span className="font-bold">{log.botUsername}</span>
                            {log.targetUsername ? (
                                <>
                                    , <Link href={`/profile/${log.targetUserId}`} className="text-primary font-semibold hover:underline">{log.targetUsername}</Link>
                                    {` `}{getActionText(log)}
                                </>
                            ) : (
                                ` ${getActionText(log)}`
                            )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                             {log.timestamp ? formatDistanceToNow(new Date(log.timestamp.seconds * 1000), { addSuffix: true, locale: tr }) : ''}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
