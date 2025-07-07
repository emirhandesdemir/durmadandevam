// src/components/dm/DMChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile, DirectMessage } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2, ShieldAlert, ShieldCheck, Crown } from 'lucide-react';
import NewMessageInput from './NewMessageInput';
import MessageBubble from './MessageBubble';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { unblockUser } from '@/lib/actions/userActions';

interface DMChatProps {
  chatId: string;
  partner: UserProfile;
}

/**
 * Belirli bir kullanıcı ile olan sohbetin arayüzünü oluşturur.
 */
export default function DMChat({ chatId, partner }: DMChatProps) {
  const { user, userData } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUnblocking, setIsUnblocking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Mesajları gerçek zamanlı olarak dinle
    const messagesRef = collection(db, 'directMessages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Mesajlar alınırken hata:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId]);

  useEffect(() => {
    // Yeni mesaj geldiğinde en alta kaydır
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const haveIBlocked = userData?.blockedUsers?.includes(partner.uid);
  const amIBlockedByPartner = partner.blockedUsers?.includes(user?.uid);
  
  const handleUnblock = async () => {
    if (!userData) return;
    setIsUnblocking(true);
    try {
        const result = await unblockUser(userData.uid, partner.uid);
        if (result.success) {
            toast({ description: `${partner.username} kullanıcısının engeli kaldırıldı.` });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ variant: 'destructive', description: error.message });
    } finally {
        setIsUnblocking(false);
    }
  };
  
  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  if (!user || !userData) return null;

  const isPartnerPremium = partner.premiumUntil && (partner.premiumUntil as Timestamp).toDate() > new Date();

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-3 border-b shrink-0">
        <Button asChild variant="ghost" size="icon" className="md:hidden rounded-full">
            <Link href="/dm"><ChevronLeft /></Link>
        </Button>
        <Link href={`/profile/${partner.uid}`} className="flex items-center gap-3">
            <div className="relative">
                <div>
                    <Avatar className="relative z-[1]">
                        <AvatarImage src={partner.photoURL || undefined} />
                        <AvatarFallback>{partner.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                {partner.isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" aria-label="Çevrimiçi" />
                )}
            </div>
            <div>
                <h2 className="font-bold text-lg flex items-center gap-1.5">
                  {partner.username}
                  {isPartnerPremium && <Crown className="h-4 w-4 text-amber-500"/>}
                </h2>
                <p className="text-xs text-muted-foreground">
                    {partner.isOnline 
                        ? <span className="text-green-500 font-semibold">Çevrimiçi</span>
                        : partner.lastSeen 
                            ? `Son görülme: ${formatDistanceToNow((partner.lastSeen as Timestamp).toDate(), { addSuffix: true, locale: tr })}`
                            : 'Çevrimdışı'
                    }
                </p>
            </div>
        </Link>
      </header>

      {/* Mesaj Alanı */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => {
            return <MessageBubble key={msg.id} message={msg} currentUserId={user.uid} chatId={chatId} />;
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Mesaj Giriş Alanı */}
      <footer className="p-3 border-t bg-background">
        {haveIBlocked ? (
           <div className="flex flex-col items-center justify-center text-center p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                    <span className="font-bold">{partner.username}</span> adlı kullanıcıyı engellediniz.
                </p>
                <p className="text-xs text-muted-foreground mb-3">Mesaj göndermek için engeli kaldırmalısınız.</p>
                <Button onClick={handleUnblock} disabled={isUnblocking}>
                    {isUnblocking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <ShieldCheck className="mr-2 h-4 w-4"/>}
                    Engeli Kaldır
                </Button>
            </div>
        ) : amIBlockedByPartner ? (
             <div className="flex items-center justify-center text-center p-4 bg-muted rounded-lg">
                <ShieldAlert className="h-5 w-5 mr-2 text-destructive"/>
                <p className="text-sm font-medium text-muted-foreground">Bu kullanıcı tarafından engellendiniz. Mesaj gönderemezsiniz.</p>
            </div>
        ) : (
             <div className="bg-muted rounded-full">
                <NewMessageInput
                  chatId={chatId}
                  sender={{ uid: user.uid, username: userData.username, photoURL: userData.photoURL }}
                  receiver={{ uid: partner.uid, username: partner.username, photoURL: partner.photoURL }}
                />
            </div>
        )}
      </footer>
    </div>
  );
}
