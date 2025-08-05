// src/components/dm/DMChat.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, onSnapshot, orderBy, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { UserProfile, DirectMessage } from '@/lib/types';
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

export interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  profileEmoji: string | null;
  selectedAvatarFrame?: string;
}

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
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Mesajları gerçek zamanlı olarak dinle
    const messagesRef = collection(db, 'directMessages', chatId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DirectMessage));
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      console.error("Mesajlar alınırken hata:", error);
      setLoading(false);
    });
    
    // Partnerin yazma durumunu dinle
    const metadataRef = doc(db, 'directMessagesMetadata', chatId);
    const unsubscribeMetadata = onSnapshot(metadataRef, (doc) => {
        if (doc.exists() && user) {
            const data = doc.data();
            const partnerTypingTimestamp = data.typingStatus?.[partner.uid] as Timestamp | undefined;
            if (partnerTypingTimestamp && (Timestamp.now().seconds - partnerTypingTimestamp.seconds) < 5) {
                setIsPartnerTyping(true);
            } else {
                setIsPartnerTyping(false);
            }
        }
    });

    return () => {
        unsubscribeMessages();
        unsubscribeMetadata();
    }
  }, [chatId, user, partner.uid]);

  useEffect(() => {
    // Yeni mesaj geldiğinde en alta kaydır
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const haveIBlocked = userData?.blockedUsers?.includes(partner.uid);
  const amIBlockedByPartner = partner.blockedUsers?.includes(user?.uid || '');
  
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

  const isPartnerPremium = partner.premiumUntil && new Date((partner.premiumUntil as any)?.seconds * 1000 || partner.premiumUntil) > new Date();
  
  const getSubtext = () => {
    if (isPartnerTyping) {
        return <span className="text-primary font-semibold animate-pulse">yazıyor...</span>;
    }
    if (partner.isOnline) {
        return <span className="text-green-500 font-semibold">Çevrimiçi</span>;
    }
    if (partner.lastSeen) {
        return `Son görülme: ${formatDistanceToNow(new Date((partner.lastSeen as any)?.seconds * 1000 || partner.lastSeen), { addSuffix: true, locale: tr })}`;
    }
    return 'Çevrimdışı';
  }


  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="flex items-center gap-4 p-3 border-b shrink-0">
        <Button asChild variant="ghost" size="icon" className="md:hidden rounded-full">
            <Link href="/dm"><ChevronLeft /></Link>
        </Button>
        <Link href={`/profile/${partner.uid}`} className="flex items-center gap-3">
            <div className="relative">
                <div className={cn("avatar-frame-wrapper", partner.selectedAvatarFrame)}>
                    <Avatar className="relative z-[1]">
                        <AvatarImage src={partner.photoURL || undefined} />
                        <AvatarFallback>{partner.profileEmoji || partner.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                </div>
                {partner.isOnline && !isPartnerTyping && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" aria-label="Çevrimiçi" />
                )}
            </div>
            <div>
                <h2 className="font-bold text-lg flex items-center gap-1.5">
                  {partner.username}
                  {isPartnerPremium && <Crown className="h-4 w-4 text-amber-500"/>}
                </h2>
                <p className="text-xs text-muted-foreground">{getSubtext()}</p>
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
             <div className="dm-input-glow rounded-full">
                <NewMessageInput
                  chatId={chatId}
                  sender={{ uid: user.uid, username: userData.username, photoURL: userData.photoURL, profileEmoji: userData.profileEmoji, selectedAvatarFrame: userData.selectedAvatarFrame }}
                  receiver={{ uid: partner.uid, username: partner.username, photoURL: partner.photoURL, profileEmoji: partner.profileEmoji, selectedAvatarFrame: partner.selectedAvatarFrame }}
                />
            </div>
        )}
      </footer>
    </div>
  );
}
