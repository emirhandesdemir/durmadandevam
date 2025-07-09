
// src/app/(main)/premium/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Gem, BadgeCheck, Palette, Users, Rocket, Sparkles, CheckCircle } from 'lucide-react';
import { differenceInDays, differenceInHours, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import Link from 'next/link';

function BenefitItem({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) {
    return (
        <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
            </div>
            <div>
                <h4 className="font-semibold">{title}</h4>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
        </div>
    );
}

export default function PremiumPage() {
    const { userData } = useAuth();
    const router = useRouter();
    const [timeLeft, setTimeLeft] = useState('');

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    useEffect(() => {
        if (!isPremium) {
            router.replace('/store');
            return;
        }

        const calculateTimeLeft = () => {
            if (userData?.premiumUntil) {
                const now = new Date();
                const expiryDate = userData.premiumUntil.toDate();
                const days = differenceInDays(expiryDate, now);
                if (days > 1) {
                    setTimeLeft(`${days} gün kaldı`);
                } else {
                    const hours = differenceInHours(expiryDate, now);
                    setTimeLeft(`${hours > 0 ? hours : 0} saat kaldı`);
                }
            }
        };

        calculateTimeLeft();
        const interval = setInterval(calculateTimeLeft, 60000); // update every minute

        return () => clearInterval(interval);

    }, [isPremium, router, userData]);


    if (!isPremium) {
        return null; // or a loading spinner
    }

    return (
        <div className="container mx-auto max-w-3xl py-6 animate-in fade-in">
             <div className="flex items-center gap-3 mb-6">
                <Crown className="h-8 w-8 text-yellow-500" />
                <h1 className="text-3xl font-bold tracking-tight">Premium Durumun</h1>
            </div>

            <Card className="bg-gradient-to-br from-yellow-500/10 via-background to-background border-yellow-500/30">
                <CardHeader>
                    <CardTitle>Üyelik Aktif</CardTitle>
                    <CardDescription>
                        Bitiş Tarihi: {format(userData!.premiumUntil!.toDate(), 'PPpp', { locale: tr })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">{timeLeft}</div>
                </CardContent>
            </Card>

             <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Premium Avantajların</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <BenefitItem 
                        icon={BadgeCheck}
                        title="Özel Profil Rozeti"
                        description="Profilinde ve sohbetlerde kullanıcı adının yanında özel bir kırmızı kral tacı rozeti görünür."
                    />
                    <BenefitItem 
                        icon={Palette}
                        title="Özel Görsel Efektler"
                        description="Profil resmin için kırmızı parlayan bir çerçeve ve sohbetlerde kullanabileceğin özel kırmızı baloncuk efekti."
                    />
                     <BenefitItem 
                        icon={Users}
                        title="Ücretsiz Oda Limiti Arttırma"
                        description="Sahip olduğun odaların katılımcı limitini elmas harcamadan ücretsiz olarak artırabilirsin."
                    />
                    {userData?.isFirstPremium && (
                         <BenefitItem 
                            icon={Gem}
                            title="Tek Seferlik Hoş Geldin Hediyesi"
                            description="İlk premium üyeliğine özel olarak hesabına 100 elmas ve 3 gün boyunca sınırsız oda oluşturma hakkı tanımlandı!"
                        />
                    )}
                </CardContent>
            </Card>

            <div className="mt-6 text-center">
                <Button asChild>
                    <Link href="/store">Mağazaya Göz At</Link>
                </Button>
            </div>
        </div>
    );
}
