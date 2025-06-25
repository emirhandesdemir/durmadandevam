// src/app/admin/posts/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Gönderi Yöneticisi" sayfasıdır.
// Bu sayfa, gönderileri listelemek, düzenlemek veya silmek için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function PostManagerPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <FileText className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gönderi Yöneticisi</h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcı gönderilerini yönetin, düzenleyin veya kaldırın.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında gönderileri burada listeleyip yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
