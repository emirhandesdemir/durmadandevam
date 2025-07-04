// src/app/admin/theme/page.tsx
"use client";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Palette, Construction } from "lucide-react";

export default function ThemeSettingsPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Palette className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tema Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanın genel görünümü hakkında bilgi.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Tema Bilgisi</CardTitle>
          <CardDescription>
            Uygulama artık kalıcı olarak aydınlık temayı kullanmaktadır.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center text-center p-8">
          <Construction className="h-12 w-12 text-muted-foreground mb-4" />
           <p className="text-muted-foreground">
            Çoklu tema desteği ve dinamik tema düzenleyici, daha stabil bir deneyim sunmak amacıyla kaldırılmıştır.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
