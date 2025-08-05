// src/app/(main)/profile/app-settings/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, BatteryCharging, Wifi, Sparkles, Database } from "lucide-react";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { updateUserProfile } from "@/lib/actions/userActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { AppSettings } from "@/lib/types";

const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function AppSettingsPage() {
    const { userData, loading, refreshUserData } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    const [settings, setSettings] = useState<AppSettings>({
        batterySaver: false,
        dataSaver: false,
        disableAnimations: false,
    });

    useEffect(() => {
        if (userData?.appSettings) {
            setSettings(userData.appSettings);
        }
    }, [userData]);
    
    const handleSettingChange = (key: keyof AppSettings, value: boolean) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            await updateUserProfile({
                userId: userData.uid,
                appSettings: settings,
            });
            await refreshUserData();
            toast({ description: "Uygulama ayarlarınız kaydedildi." });
        } catch (e: any) {
            toast({ variant: 'destructive', description: "Ayarlar kaydedilemedi." });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !userData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile"><ChevronLeft className="mr-2 h-4 w-4"/> Geri</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kaydet
                </Button>
            </header>
            <div className="p-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Performans ve Tasarruf</CardTitle>
                        <CardDescription>Uygulamanın performansını, veri ve pil kullanımını kişiselleştirin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="battery-saver" className="font-semibold flex items-center gap-2"><BatteryCharging className="h-4 w-4"/> Pil Tasarrufu</Label>
                                <p className="text-xs text-muted-foreground pl-6">Arka plan animasyonları ve efektleri devre dışı bırakılır.</p>
                            </div>
                            <Switch id="battery-saver" checked={settings.batterySaver} onCheckedChange={(val) => handleSettingChange('batterySaver', val)} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="data-saver" className="font-semibold flex items-center gap-2"><Wifi className="h-4 w-4"/> Veri Tasarrufu</Label>
                                <p className="text-xs text-muted-foreground pl-6">Resim ve video kalitesini düşürerek veri kullanımını azaltır.</p>
                            </div>
                            <Switch id="data-saver" checked={settings.dataSaver} onCheckedChange={(val) => handleSettingChange('dataSaver', val)} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="disable-animations" className="font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4"/> Arayüz Animasyonlarını Kapat</Label>
                                <p className="text-xs text-muted-foreground pl-6">Sayfa geçişleri ve diğer arayüz animasyonlarını kapatır.</p>
                            </div>
                            <Switch id="disable-animations" checked={settings.disableAnimations} onCheckedChange={(val) => handleSettingChange('disableAnimations', val)} />
                        </div>
                    </CardContent>
                </Card>
                 <Card className="bg-secondary">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Database className="h-5 w-5"/>Veri Tasarruf Raporu</CardTitle>
                        <CardDescription>Veri tasarruf modu açıkken bu zamana kadar ne kadar tasarruf yaptığınızı gösterir.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <p className="text-2xl font-bold text-primary">{formatBytes(userData.dataSaved || 0)}</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
