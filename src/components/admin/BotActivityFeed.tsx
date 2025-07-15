// src/components/admin/BotActivityFeed.tsx
'use client';

import { useEffect, useState } from 'react';
import type { BotActivityLog } from '@/lib/types';
import { Loader2, MessageCircle, Heart, FileUp, UserPlus, Send } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

/**
 * Gelen zaman damgası verisini güvenli bir şekilde Date nesnesine dönüştürür.
 * Veri, sunucudan istemciye geçerken farklı formatlarda (ISO string, obje) gelebilir.
 * Bu fonksiyon bu durumları yönetir.
 * @param timestamp - Dönüştürülecek zaman damgası verisi.
 * @returns Geçerli bir Date nesnesi veya null.
 */
const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    
    // Zaten bir Date nesnesi ise doğrudan döndür.
    if (timestamp instanceof Date) return timestamp;

    // ISO string formatını işle (örn: "2024-01-01T12:00:00.000Z").
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }

    // Firestore'dan gelen obje formatını işle (örn: { seconds: ..., nanoseconds: ... }).
    if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000);
    }
    
    // Tanınmayan formatlar için null döndür.
    return null;
};


export default function BotActivityFeed() {
    const [logs, setLogs] = useState<BotActivityLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // This function is removed, so we'll just show an empty state.
        setLoading(false);
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
        return <p className="text-sm text-center text-muted-foreground p-4">Bu özellik sistemden kaldırılmıştır.</p>
    }

    return (
        <div className="space-y-4">
            {logs.map(log => {
                const date = parseTimestamp(log.timestamp);
                return (
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
                                 {date ? formatDistanceToNow(date, { addSuffix: true, locale: tr }) : ''}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
