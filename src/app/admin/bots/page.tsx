// src/app/admin/bots/page.tsx
'use client';
import { Bot } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function BotManagerPage() {
    return (
        <div>
            <div className="flex items-center gap-4">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Bot Sistemi Kaldırıldı</h1>
                    <p className="text-muted-foreground mt-1">
                       Bu özellik ve ilgili tüm bileşenler sistemden kaldırılmıştır.
                    </p>
                </div>
            </div>
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Sistem Temizlendi</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Bot yönetimiyle ilgili tüm sayfalar, sunucu eylemleri ve arka plan görevleri başarıyla kaldırıldı.</p>
                </CardContent>
            </Card>
        </div>
    );
}
