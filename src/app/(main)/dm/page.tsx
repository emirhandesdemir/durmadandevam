
// src/app/(main)/dm/page.tsx
import ChatList from '@/components/dm/ChatList';
import { MessageCircle } from 'lucide-react';

/**
 * Ana DM sayfası (/dm).
 * Bu sayfa, sol tarafta sohbet listesini ve sağ tarafta (geniş ekranlarda)
 * kullanıcıya bir sohbet seçmesini söyleyen bir yer tutucu (placeholder) gösterir.
 */
export default function DirectMessagesPage() {
  return (
    <div className="flex h-full border-t">
      {/* Tüm sohbetleri listeleyen bileşen */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r">
        <ChatList />
      </div>
      {/* Sadece orta ve büyük ekranlarda görünen yer tutucu bölümü */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-muted/30">
        <MessageCircle className="h-16 w-16 text-muted-foreground" />
        <h2 className="mt-4 text-2xl font-bold">Bir sohbet seç</h2>
        <p className="mt-2 text-muted-foreground">
          Konuşmalarınıza devam etmek için soldaki listeden bir sohbet seçin.
        </p>
      </div>
    </div>
  );
}
