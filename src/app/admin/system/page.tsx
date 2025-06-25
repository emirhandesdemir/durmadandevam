// src/app/admin/system/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Sistem Ayarları" sayfasıdır.
// Bu sayfa, uygulama genelindeki limitler ve yapılandırmalar için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function SystemSettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistem Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanın genel işleyişini ve limitlerini yapılandırın.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında sistem ayarlarını buradan yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
