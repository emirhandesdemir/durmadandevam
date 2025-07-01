// src/app/admin/deploy/page.tsx
"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Server, AlertTriangle, CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

/**
 * Yönetim Paneli - Dağıtımlar Sayfası
 * 
 * Bu sayfa, yöneticiye sunucu tarafı fonksiyonlarının (örn: anlık bildirim servisi)
 * nasıl dağıtılacağı (deploy edileceği) konusunda bilgi ve talimatlar sunar.
 */
export default function DeployPage() {
    const { toast } = useToast();
    const command = "firebase deploy --only functions";

    // Komutu panoya kopyalama fonksiyonu.
    const copyCommand = () => {
        navigator.clipboard.writeText(command);
        toast({
            description: "Komut panoya kopyalandı!",
        });
    };

    return (
        <div>
            {/* Sayfa Başlığı */}
            <div className="flex items-center gap-4">
                <CloudUpload className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sistem Dağıtımları</h1>
                    <p className="text-muted-foreground mt-1">
                        Uygulamanın sunucu tarafı özelliklerini yönetin ve dağıtın.
                    </p>
                </div>
            </div>

            {/* Uyarı Kartı */}
            <Card className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
                <CardHeader className="flex-row items-start gap-4">
                    <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-1" />
                    <div>
                        <CardTitle className="text-yellow-900 dark:text-yellow-200">Manuel İşlem Gerekli</CardTitle>
                        <CardDescription className="text-yellow-800 dark:text-blue-300">
                            Bazı özelliklerin tam olarak çalışabilmesi için, kodun Google sunucularına bir defaya mahsus yüklenmesi (dağıtılması) gerekir. Bu işlem benim yeteneklerimin dışındadır ve terminal üzerinden yapılmalıdır.
                        </CardDescription>
                    </div>
                </CardHeader>
            </Card>

            {/* Anlık Bildirim Servisi Kartı */}
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
                        {/* Kopyalanabilir komut alanı */}
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
        </div>
    );
}
