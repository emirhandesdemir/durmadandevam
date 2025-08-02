// src/app/(main)/wallet/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Gift, Loader2, Store, ExternalLink } from "lucide-react";
import { convertProfileValueToDiamonds } from "@/lib/actions/giftActions";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { giftList } from "@/lib/gifts";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { giftLevelThresholds } from "@/lib/gifts";


export default function WalletPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [isConverting, setIsConverting] = useState(false);

    if (!user || !userData) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    const handleConvert = async () => {
        setIsConverting(true);
        try {
            const result = await convertProfileValueToDiamonds(user.uid);
            if (result.success) {
                toast({
                    title: "Dönüştürme Başarılı!",
                    description: `Hediye değerinizden ${result.convertedAmount} elmas kazandınız.`
                });
            } else {
                throw new Error("Dönüştürme işlemi başarısız oldu.");
            }
        } catch (error: any) {
             toast({ variant: 'destructive', description: error.message || 'Bir hata oluştu.' });
        } finally {
            setIsConverting(false);
        }
    };
    
    const currentLevelInfo = giftLevelThresholds.find(t => t.level === userData.giftLevel) || { level: 0, diamonds: 0 };
    const nextLevelInfo = giftLevelThresholds.find(t => t.level === (userData.giftLevel || 0) + 1);
    
    let progress = 0;
    if (nextLevelInfo) {
        const diamondsForCurrentLevel = currentLevelInfo.diamonds;
        const diamondsForNextLevel = nextLevelInfo.diamonds - diamondsForCurrentLevel;
        const progressInLevel = (userData.totalDiamondsSent || 0) - diamondsForCurrentLevel;
        progress = (progressInLevel / diamondsForNextLevel) * 100;
    } else {
        progress = 100; // Max level
    }


    return (
        <div className="container mx-auto max-w-2xl py-6 space-y-6">
             <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">Cüzdanım</h1>
            </div>

            <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg">Toplam Bakiye</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Gem className="h-10 w-10" />
                        <span className="text-5xl font-bold tracking-tighter">{userData.diamonds?.toLocaleString('tr-TR') || 0}</span>
                    </div>
                     <Button asChild variant="secondary">
                        <Link href="/store"><Store className="mr-2 h-4 w-4"/> Mağaza</Link>
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Hediye Değeri</CardTitle>
                    <CardDescription>Profiline gönderilen hediyelerin toplam değeri. Bunu elmasa dönüştürebilirsin.</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <p className="font-bold text-2xl text-primary">{userData.profileValue || 0} Değer</p>
                    <Button onClick={handleConvert} disabled={isConverting || (userData.profileValue || 0) <= 0}>
                        {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Gem className="mr-2 h-4 w-4"/>}
                        Elmasa Dönüştür (%70)
                    </Button>
                </CardContent>
             </Card>

             <Card>
                 <CardHeader>
                    <CardTitle>Hediye Seviyesi</CardTitle>
                    <CardDescription>Hediye göndererek seviye atla ve özel avantajlar kazan.</CardDescription>
                </CardHeader>
                 <CardContent className="space-y-4">
                    <div className="text-center space-y-1">
                        <p className="text-sm text-muted-foreground">Mevcut Seviyen</p>
                        <p className="text-5xl font-bold text-amber-500 drop-shadow-lg">SV {userData.giftLevel || 0}</p>
                    </div>
                    {nextLevelInfo ? (
                        <div>
                             <div className="flex justify-between items-end mb-1">
                                <p className="text-xs font-semibold">Seviye {nextLevelInfo.level} için ilerleme</p>
                                <p className="text-xs text-muted-foreground">
                                    <span className="font-bold text-foreground">{(userData.totalDiamondsSent || 0).toLocaleString('tr-TR')}</span> / {nextLevelInfo.diamonds.toLocaleString('tr-TR')}
                                </p>
                            </div>
                            <Progress value={progress} className="h-3"/>
                        </div>
                    ) : (
                        <p className="text-center font-semibold text-green-500">Maksimum seviyeye ulaştın!</p>
                    )}
                </CardContent>
             </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Hediyeler</CardTitle>
                    <CardDescription>Uygulamada gönderebileceğin mevcut hediyeler.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                     {giftList.map(gift => {
                        if (!gift.icon) return null; // Add this check to prevent crash
                        const GiftIcon = gift.icon;
                        return (
                            <div key={gift.id} className="flex flex-col items-center justify-center gap-2 p-3 rounded-lg border bg-muted/50">
                                <GiftIcon className="h-10 w-10 text-primary" />
                                <p className="text-sm font-semibold">{gift.name}</p>
                                <div className="flex items-center gap-1 text-xs font-bold text-cyan-500">
                                    <Gem className="h-3 w-3" />
                                    {gift.diamondCost}
                                </div>
                            </div>
                        )
                    })}
                </CardContent>
            </Card>

        </div>
    )
}
