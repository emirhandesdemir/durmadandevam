// src/app/admin/bots/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Sparkles, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createInitialBots, getBotCount } from '@/lib/actions/botActions';

export default function BotManagerPage() {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [botCount, setBotCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(true);

    useEffect(() => {
        getBotCount().then(count => {
            setBotCount(count);
            setLoadingCount(false);
        });
    }, []);

    const handleCreateBots = async () => {
        setIsCreating(true);
        try {
            const result = await createInitialBots();
            if (result.success) {
                toast({
                    title: 'Botlar Oluşturuldu!',
                    description: `${result.createdCount} yeni bot başarıyla sisteme eklendi.`,
                });
                setBotCount(prev => prev + (result.createdCount || 0));
            } else {
                throw new Error(result.error || 'Botlar oluşturulurken bilinmeyen bir hata oluştu.');
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Hata',
                description: error.message,
            });
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4">
                <Bot className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Otomatik Bot Yönetimi</h1>
                    <p className="text-muted-foreground mt-1">
                        Uygulamanın içeriğini canlı tutmak için bot kullanıcıları oluşturun ve yönetin.
                    </p>
                </div>
            </div>
            
            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Bot Durumu</CardTitle>
                    <CardDescription>
                        Sistemdeki mevcut bot kullanıcı sayısı.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-bold flex items-center gap-3">
                        {loadingCount ? <Loader2 className="h-8 w-8 animate-spin" /> : botCount}
                        <span className="text-lg text-muted-foreground font-normal">bot</span>
                    </div>
                </CardContent>
            </Card>

            <Card className="mt-6">
                <CardHeader>
                    <CardTitle>Başlangıç Botlarını Oluştur</CardTitle>
                    <CardDescription>
                        Bu işlem, sisteme 8 adet (6 kadın, 2 erkek) başlangıç botu ekler. Bu botlar otomatik olarak içerik paylaşmaya ve etkileşimde bulunmaya başlayacaktır. Bu işlemi sadece bir kez çalıştırmanız önerilir.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Button onClick={handleCreateBots} disabled={isCreating}>
                        {isCreating ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles className="mr-2 h-4 w-4" />
                        )}
                        {isCreating ? 'Botlar Oluşturuluyor...' : '8 Başlangıç Botu Oluştur'}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
