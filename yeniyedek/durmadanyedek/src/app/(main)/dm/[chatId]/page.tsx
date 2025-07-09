// src/app/(main)/dm/[chatId]/page.tsx
'use client'; // Bu sayfa, kullanıcı etkileşimine ve anlık güncellemelere dayalı olduğu için bir istemci bileşenidir.

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { markMessagesAsRead } from '@/lib/actions/dmActions';
import type { UserProfile } from '@/lib/types';
import DMChat from '@/components/dm/DMChat';
import ChatList from '@/components/dm/ChatList';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

/**
 * Belirli bir sohbeti görüntülemek için dinamik sayfa.
 * URL'den sohbet ID'sini alır ve ilgili sohbeti render eder.
 */
export default function ChatPage() {
  // Gerekli hook'lar ve context'ler.
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const chatId = params.chatId as string;
  
  // State'ler: sohbet partnerinin bilgileri ve yükleme durumu.
  const [partner, setPartner] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sohbet açıldığında, okunmamış mesajları okundu olarak işaretle.
  useEffect(() => {
    if (user && chatId) {
      markMessagesAsRead(chatId, user.uid);
    }
  }, [chatId, user]);

  // Sohbet partnerinin bilgilerini anlık olarak Firestore'dan çek.
  useEffect(() => {
    if (!user || !chatId) return;

    // Sohbet ID'si iki kullanıcının UID'sinin birleşiminden oluşur. Buradan partnerin UID'sini çıkar.
    const partnerId = chatId.split('_').find(uid => uid !== user.uid);
    
    if (partnerId) {
      const partnerDocRef = doc(db, 'users', partnerId);
      // Partnerin kullanıcı dokümanını dinle.
      const unsubscribe = onSnapshot(partnerDocRef, (docSnap) => {
        if (docSnap.exists()) {
            setPartner(docSnap.data() as UserProfile);
        } else {
             // Eğer partner bulunamazsa hata göster ve kullanıcıyı ana DM sayfasına yönlendir.
             toast({ variant: 'destructive', description: "Sohbet partneri bulunamadı." });
             router.replace('/dm');
        }
        setLoading(false);
      });
      // Component unmount olduğunda dinleyiciyi temizle.
      return () => unsubscribe(); 
    } else {
        setLoading(false);
    }
  }, [chatId, user, toast, router]);

  // Veri yüklenirken bir yükleme animasyonu göster.
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

  // Partner bulunamadıysa bir hata mesajı göster.
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

  // Her şey yolundaysa, sohbet listesi ve asıl sohbet penceresini göster.
  return (
    <div className="flex h-full border-t">
      {/* Geniş ekranlarda sohbet listesi solda görünür. */}
      <div className="hidden md:block md:w-1/3 lg:w-1/4 border-r">
        <ChatList selectedChatId={chatId} />
      </div>
      {/* Seçili sohbetin içeriğini gösteren bileşen. */}
      <div className="flex-1">
        <DMChat chatId={chatId} partner={partner} />
      </div>
    </div>
  );
}
