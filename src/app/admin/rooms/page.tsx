// src/app/admin/rooms/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Oda Yöneticisi" sayfasıdır.
// Bu sayfa, odaları listelemek, düzenlemek veya silmek için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function RoomManagerPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <MessageSquare className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Oda Yöneticisi</h1>
          <p className="text-muted-foreground mt-1">
            Aktif odaları yönetin, sohbetleri izleyin veya odaları kapatın.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında odaları burada listeleyip yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
