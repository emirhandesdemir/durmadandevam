// src/app/admin/questions/page.tsx
// Bu bileşen, Admin Paneli'ndeki "Soru Yöneticisi" sayfasıdır.
// Bu sayfa, uygulama içi quiz veya anket sorularını yönetmek için kullanılacaktır.
// Şu an için bir yer tutucu olarak tasarlanmıştır.

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Puzzle } from "lucide-react";

export default function QuestionManagerPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Puzzle className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Soru Yöneticisi</h1>
          <p className="text-muted-foreground mt-1">
            Uygulama içi quizler için soruları ekleyin, düzenleyin veya kaldırın.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Geliştirme Aşamasında</CardTitle>
          <CardDescription>
            Bu bölüm şu anda yapım aşamasındadır. Yakında soruları burada yönetebileceksiniz.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">Özellikler yolda!</p>
        </CardContent>
      </Card>
    </div>
  );
}
