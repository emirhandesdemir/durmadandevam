// src/app/admin/theme/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Tema Ayarları" sayfasıdır.
// Bu sayfa, uygulamanın genel renk paletini ve modlarını yönetmek için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Palette } from "lucide-react";

export default function ThemeSettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Palette className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tema Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanın görünümünü (renkler, karanlık/aydınlık mod) yönetin.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında tema ayarlarını buradan yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
