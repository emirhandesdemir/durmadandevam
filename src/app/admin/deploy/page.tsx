// src/app/admin/deploy/page.tsx
"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Server, AlertTriangle, CloudUpload, BellRing, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/contexts/AuthContext';
import { createNotification } from '@/lib/actions/notificationActions';

export default function DeployPage() {
    const { toast } = useToast();
    const command = "firebase deploy --only functions";
    const { user } = useAuth();
    const [isSending, setIsSending] = useState(false);

    const copyCommand = () => {
        navigator.clipboard.writeText(command);
        toast({
            description: "Komut panoya kopyalandı!",
        });
    };

    const handleTestNotification = async () => {
        if (!user) {
            toast({ variant: 'destructive', description: "Test için giriş yapmış olmalısınız." });
            return;
        }
        setIsSending(true);
        try {
            await createNotification({
                recipientId: user.uid,
                senderId: "system-test",
                senderUsername: "Test Sistemi",
                senderAvatar: "https://placehold.co/100x100.png",
                type: 'comment',
                commentText: "Bu, bildirim sisteminin çalıştığını doğrulayan bir test mesajıdır.",
            });
            toast({ description: "Test bildirimi tetiklendi. Birkaç saniye içinde cihazınıza ulaşacaktır." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Hata", description: `Test bildirimi gönderilemedi: ${error.message}` });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4">
                <CloudUpload className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistem Dağıtımları</h1>
                    <p className="text-muted-foreground mt-1">
                        Uygulamanın sunucu tarafı özelliklerini yönetin ve dağıtın.
                    </p>
                </div>
            </div>

            <Card className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="flex-row items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-1" />
                    <div>
                        <CardTitle className="text-yellow-900 dark:text-yellow-200">Manuel İşlem Gerekli</CardTitle>
                        <CardDescription className="text-yellow-800 dark:text-blue-300">
                            Anlık bildirim gibi bazı özelliklerin tam olarak çalışabilmesi için, kodun Google sunucularına bir defaya mahsus yüklenmesi (dağıtılması) gerekir. Bu işlem benim yeteneklerimin dışındadır ve terminal üzerinden yapılmalıdır.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Server className="h-6 w-6" />
                        Anlık Bildirim Servisi
                    </CardTitle>
                    <CardDescription>
                        Uygulama kapalıyken bile kullanıcılara bildirim gönderen sunucu mantığı.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 rounded-lg border bg-muted p-4">
                        <div className="flex-1">
                            <p className="font-semibold">Durum: <span className="text-orange-500">Dağıtım Bekleniyor</span></p>
                            <p className="text-sm text-muted-foreground mt-1">Bu servisi aktif etmek için aşağıdaki komutu terminalde çalıştırın.</p>
                        </div>
                        <div className="flex items-center gap-2 rounded-md bg-background p-2 pl-4 border font-mono text-sm">
                            <span>{command}</span>
                            <Button variant="ghost" size="icon" onClick={copyCommand}>
                                <Copy className="h-4 w-4"/>
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">
                        Bu komutu çalıştırmak için bilgisayarınızda Firebase CLI yüklü olmalıdır. Detaylı bilgi için projedeki `functions/README.md` dosyasını inceleyebilirsiniz.
                    </p>
                </CardFooter>
            </Card>
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BellRing className="h-6 w-6 text-primary" />
                        Bildirim Servisini Test Et
                    </CardTitle>
                    <CardDescription>
                        Dağıtım yaptıktan sonra, fonksiyonun doğru şekilde tetiklendiğini ve OneSignal'ın çalıştığını kontrol etmek için kendinize bir test bildirimi gönderin.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleTestNotification} disabled={isSending}>
                        {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BellRing className="mr-2 h-4 w-4" />}
                        Kendime Test Bildirimi Gönder
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
