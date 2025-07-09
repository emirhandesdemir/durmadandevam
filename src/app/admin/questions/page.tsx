// src/app/admin/questions/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Puzzle } from "lucide-react";

export default function QuestionManagerPage() {
    return (
        <div>
            <div className="flex items-center gap-4">
                <Puzzle className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quiz Soru Yönetimi</h1>
                    <p className="text-muted-foreground mt-1">
                        Bu özellik sistemden kaldırılmıştır.
                    </p>
                </div>
            </div>
             <Card className="mt-8 bg-muted/50 border-dashed">
                <CardHeader>
                    <CardTitle>Sistem Kaldırıldı</CardTitle>
                    <CardDescription>
                       Quiz oyunu ve ilgili tüm bileşenler, yöneticinin isteği üzerine uygulamadan kaldırılmıştır.
                    </CardDescription>
                </CardHeader>
            </Card>
        </div>
    );
}
