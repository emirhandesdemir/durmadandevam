// src/app/admin/users/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Kullanıcı Yöneticisi" sayfasıdır.
// Bu sayfa, kullanıcıları listelemek, profillerini görüntülemek, yasaklamak veya silmek için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function UserManagerPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Yöneticisi</h1>
          <p className="text-muted-foreground mt-1">
            Kullanıcıları görüntüleyin, rollerini yönetin veya hesaplarını askıya alın.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında kullanıcıları burada listeleyip yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
