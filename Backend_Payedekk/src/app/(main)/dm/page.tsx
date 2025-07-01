// src/app/(main)/dm/page.tsx
import ChatList from '@/components/dm/ChatList';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageCircle } from 'lucide-react';

/**
 * Ana DM sayfası, sohbet listesini ve bir yer tutucuyu gösterir.
 */
export default function DirectMessagesPage() {
  return (
    <div className="flex h-full border-t">
      <div className="w-full md:w-1/3 lg:w-1/4 border-r">
        <ChatList />
      </div>
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
