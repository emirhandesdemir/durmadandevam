// src/app/admin/features/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { getFeatureFlags, updateFeatureFlags } from "@/lib/actions/featureActions";
import type { FeatureFlags } from "@/lib/types";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { SlidersHorizontal, Loader2, Gamepad2, FileLock2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Yönetim Paneli - Özellik Yönetimi Sayfası
 * 
 * Bu sayfa, yöneticinin uygulamadaki ana modülleri (quiz oyunu vb.)
 * gerçek zamanlı olarak açıp kapatmasına olanak tanır.
 */
export default function FeatureManagementPage() {
    const { toast } = useToast();
    const [flags, setFlags] = useState<FeatureFlags | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Sayfa yüklendiğinde mevcut özellik ayarlarını Firestore'dan çek.
    useEffect(() => {
        getFeatureFlags().then(data => {
            setFlags(data);
            setLoading(false);
        });
    }, []);

    // Bir özellik ayarı değiştirildiğinde bu fonksiyon çalışır.
    const handleFlagChange = async (flagName: keyof FeatureFlags, value: boolean) => {
        if (!flags) return;
        
        // Optimistic UI: Arayüzü anında güncelle.
        const newFlags = { ...flags, [flagName]: value };
        setFlags(newFlags);
        setSaving(true);
        
        try {
            // Sunucu eylemini çağırarak değişikliği veritabanına kaydet.
            const result = await updateFeatureFlags({ [flagName]: value });
            if (result.success) {
                toast({
                    title: "Başarılı",
                    description: "Özellik ayarı güncellendi.",
                });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Ayar güncellenirken bir hata oluştu: ${error.message}`,
            });
            // Hata durumunda arayüzü eski haline geri döndür.
            setFlags(flags);
        } finally {
            setSaving(false);
        }
    };
    
    // Ayarlar yüklenirken iskelet (skeleton) arayüzü göster.
    if (loading) {
        return (
            <div>
                 <Skeleton className="h-10 w-1/3 mb-2" />
                 <Skeleton className="h-6 w-2/3 mb-8" />
                 <div className="space-y-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                 </div>
            </div>
        )
    }

    return (
        <div>
            <div className="flex items-center gap-4">
                <SlidersHorizontal className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Özellik Yönetimi</h1>
                    <p className="text-muted-foreground mt-1">
                        Uygulamadaki modülleri ve özellikleri buradan açıp kapatın.
                    </p>
                </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {/* Quiz Oyunu Kartı */}
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                             <Gamepad2 className="h-6 w-6 text-primary" />
                            <CardTitle>Oyunlar</CardTitle>
                        </div>
                        <CardDescription>Oda içi oyun ve etkileşim modülleri.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="quiz-game" className="text-base">
                                    Quiz Oyunu
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                    Odaların içinde periyodik olarak quiz oyunlarını etkinleştirir.
                                </p>
                            </div>
                            <Switch
                                id="quiz-game"
                                checked={flags?.quizGameEnabled ?? true}
                                onCheckedChange={(value) => handleFlagChange('quizGameEnabled', value)}
                                disabled={saving}
                            />
                        </div>
                    </CardContent>
                </Card>
                 {/* İçerik Moderasyon Kartı */}
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                             <FileLock2 className="h-6 w-6 text-primary" />
                            <CardTitle>İçerik Moderasyonu</CardTitle>
                        </div>
                        <CardDescription>AI destekli içerik denetleme sistemleri.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                            <div className="space-y-0.5">
                                <Label htmlFor="content-moderation" className="text-base">
                                    Müstehcen İçerik Filtresi
                                </Label>
                                <p className="text-xs text-muted-foreground">
                                   Yüklenen resimlerin çıplaklık veya pornografi içerip içermediğini denetler.
                                </p>
                            </div>
                            <Switch
                                id="content-moderation"
                                checked={flags?.contentModerationEnabled ?? true}
                                onCheckedChange={(value) => handleFlagChange('contentModerationEnabled', value)}
                                disabled={saving}
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>
            {/* Kaydediliyor göstergesi */}
            {saving && (
                <div className="fixed bottom-5 right-5 flex items-center gap-2 rounded-lg bg-secondary p-3 text-secondary-foreground shadow-lg">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Ayarlar kaydediliyor...</span>
                </div>
            )}
        </div>
    );
}
