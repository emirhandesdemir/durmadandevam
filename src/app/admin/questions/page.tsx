// src/app/admin/questions/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Puzzle, AlertTriangle, Lightbulb } from "lucide-react";

export default function QuestionManagerPage() {
    return (
        <div>
            <div className="flex items-center gap-4">
                <Puzzle className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quiz Soru Yönetimi</h1>
                    <p className="text-muted-foreground mt-1">
                        Oda içi quiz oyunları için soruların yönetimi hakkında bilgi.
                    </p>
                </div>
            </div>

             <Card className="mt-8 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader className="flex-row items-start gap-4">
                    <Lightbulb className="h-6 w-6 text-blue-600 dark:text-blue-400 mt-1" />
                    <div>
                        <CardTitle className="text-blue-900 dark:text-blue-200">Otomatikleştirilmiş Sistem</CardTitle>
                        <CardDescription className="text-blue-800 dark:text-blue-300">
                            Bu özellik artık tamamen yapay zeka tarafından yönetilmektedir. Sistem, oyun zamanı geldiğinde otomatik olarak internetten güncel, çeşitli ve eğlenceli bir trivia sorusu bularak oyunu kendi kendine başlatır. Bu sayede manuel olarak soru eklemenize veya yönetmenize gerek kalmamıştır.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Ayarları Nereden Değiştirebilirim?</CardTitle>
                </CardHeader>
                 <CardContent>
                    <p className="text-muted-foreground">
                        Oyunun ne sıklıkla başlayacağı, soru süresi veya ödül miktarı gibi ayarları değiştirmek için lütfen <Link href="/admin/system" className="text-primary font-semibold hover:underline">Sistem Ayarları</Link> sayfasına gidin.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
