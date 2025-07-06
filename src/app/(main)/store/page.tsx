
'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getDiamondsForAd } from "@/lib/actions/diamondActions";
import { Crown, Gem, Loader2, Youtube } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function StorePage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const { t } = useTranslation();
    const [isWatchingAd, setIsWatchingAd] = useState(false);

    const handleWatchAd = async () => {
        if (!user) return;
        setIsWatchingAd(true);
        try {
            // Simulate watching an ad
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const result = await getDiamondsForAd(user.uid);
            toast({
                title: "Tebrikler!",
                description: t('ad_watch_success', { count: result.reward })
            });
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Hata",
                description: error.message || "Reklam izlenirken bir hata oluştu."
            });
        } finally {
            setIsWatchingAd(false);
        }
    }

    const handlePremiumClick = () => {
        toast({
            title: "Heyecan Verici Haberler!",
            description: t('premium_coming_soon_toast'),
            duration: 5000,
        });
    }

    return (
        <div className="container mx-auto max-w-3xl py-6">
            <h1 className="text-3xl font-bold tracking-tight mb-6">{t('store')}</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Youtube className="h-8 w-8 text-destructive" />
                            <CardTitle>{t('watch_ad_for_diamonds')}</CardTitle>
                        </div>
                        <CardDescription>{t('watch_ad_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" onClick={handleWatchAd} disabled={isWatchingAd}>
                            {isWatchingAd ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                            ) : (
                                <Gem className="mr-2 h-4 w-4"/>
                            )}
                            {isWatchingAd ? 'İzleniyor...' : t('watch_ad_button', { count: 5 })}
                        </Button>
                    </CardContent>
                </Card>
                <Card className="border-dashed">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Crown className="h-8 w-8 text-yellow-500" />
                            <CardTitle>{t('premium_membership')}</CardTitle>
                        </div>
                        <CardDescription>{t('premium_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button className="w-full" variant="secondary" onClick={handlePremiumClick}>
                            {t('coming_soon')}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
