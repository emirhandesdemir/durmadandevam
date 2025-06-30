// src/app/(main)/dm/[chatId]/page.tsx
'use client'; // Bu sayfayı istemci bileşeni yapıyoruz

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { getUserProfile } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import DMChat from '@/components/dm/DMChat';
import ChatList from '@/components/dm/ChatList';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Video } from 'lucide-react';

/**
 * Belirli bir sohbeti görüntülemek için dinamik sayfa.
 * Artık istemci tarafında çalışarak partner bilgisini güvenli bir şekilde alır.
 */
export default function ChatPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.chatId as string;
  
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !chatId) return;

    // Sohbet ID'sinden partnerin UID'sini çıkar
    const partnerId = chatId.split('_').find(uid => uid !== user.uid);
    
    if (partnerId) {
      getUserProfile(partnerId).then(profile => {
        if (profile) {
            setPartner(profile);
        } else {
             toast({ variant: 'destructive', description: "Sohbet partneri bulunamadı." });
             router.replace('/dm');
        }
        setLoading(false);
      });
    } else {
        setLoading(false);
    }
  }, [chatId, user, toast, router]);

  if (loading) {
    return (
        <div className="flex h-full">
            <div className="hidden md:block md:w-1/3 lg:w-1/4 border-r">
                <ChatList selectedChatId={chatId} />
            </div>
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin" />
            </div>
        </div>
    );
  }

  if (!partner) {
     return (
        <div className="flex h-full border-t">
            <div className="w-full md:w-1/3 lg:w-1/4 border-r">
                <ChatList />
            </div>
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/30">
                <h2 className="mt-4 text-2xl font-bold">Sohbet Bulunamadı</h2>
                <p className="mt-2 text-muted-foreground">
                    Bu sohbet mevcut değil veya bir hata oluştu.
                </p>
            </div>
        </div>
     );
  }

  return (
    <div className="flex h-full border-t">
      <div className="hidden md:block md:w-1/3 lg:w-1/4 border-r">
        <ChatList selectedChatId={chatId} />
      </div>
      <div className="flex-1">
        <DMChat chatId={chatId} partner={partner} />
      </div>
    </div>
  );
}
