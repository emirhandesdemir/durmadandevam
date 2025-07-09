// src/app/admin/bots/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bot, Loader2, Sparkles, UserCheck, History, PlayCircle, ToggleLeft, ToggleRight, AlertTriangle, FileText, Image as ImageIcon, Video, Heart, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createInitialBots, getBotCount, getBotAutomationStatus, toggleBotAutomation, triggerBotPostNow, triggerBotLikeNow, triggerBotCommentNow } from '@/lib/actions/botActions';
import StatCard from '@/components/admin/stat-card';
import BotActivityFeed from '@/components/admin/BotActivityFeed';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function BotManagerPage() {
    const { toast } = useToast();
    const [isCreating, setIsCreating] = useState(false);
    const [botCount, setBotCount] = useState(0);
    const [loadingCount, setLoadingCount] = useState(true);
    const [isTesting, setIsTesting] = useState(false);
    const [testingType, setTestingType] = useState<string | null>(null);

    // Bot automation state
    const [isAutomationEnabled, setIsAutomationEnabled] = useState(true);
    const [loadingAutomationStatus, setLoadingAutomationStatus] = useState(true);
    
    useEffect(() => {
        getBotCount().then(count => {
            setBotCount(count);
            setLoadingCount(false);
        });
        getBotAutomationStatus().then(status => {
            setIsAutomationEnabled(status);
            setLoadingAutomationStatus(false);
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
    
    const handleToggleAutomation = async (enabled: boolean) => {
        setIsAutomationEnabled(enabled); // Optimistic update
        try {
            await toggleBotAutomation(enabled);
            toast({
                title: 'Başarılı',
                description: `Bot otomasyonu ${enabled ? 'aktif edildi' : 'devre dışı bırakıldı'}.`,
            });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: 'Ayar değiştirilemedi.' });
            setIsAutomationEnabled(!enabled); // Revert on error
        }
    };
    
    const handleManualTrigger = async (type: 'post_text' | 'post_image' | 'post_video' | 'like' | 'comment') => {
        setIsTesting(true);
        setTestingType(type);
        let result: { success: boolean; message?: string; error?: string };
    
        try {
            switch (type) {
                case 'post_text':
                    result = await triggerBotPostNow('text');
                    break;
                case 'post_image':
                    result = await triggerBotPostNow('image');
                    break;
                case 'post_video':
                    result = await triggerBotPostNow('video');
                    break;
                case 'like':
                    result = await triggerBotLikeNow();
                    break;
                case 'comment':
                    result = await triggerBotCommentNow();
                    break;
                default:
                    throw new Error("Geçersiz test türü");
            }
    
            if (result.success) {
                toast({ title: 'Test Başarılı!', description: result.message });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
             toast({ variant: 'destructive', title: 'Test Başarısız', description: error.message });
        } finally {
            setIsTesting(false);
            setTestingType(null);
        }
    }


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
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
                <div className="lg:col-span-1 space-y-6">
                    <StatCard title="Toplam Bot Sayısı" value={botCount} icon={Bot} isLoading={loadingCount} />

                    <Card>
                         <CardHeader>
                            <CardTitle>Bot Otomasyon Kontrolü</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-center space-x-2">
                                <Switch 
                                    id="automation-switch" 
                                    checked={isAutomationEnabled} 
                                    onCheckedChange={handleToggleAutomation}
                                    disabled={loadingAutomationStatus}
                                />
                                <Label htmlFor="automation-switch" className="flex items-center gap-2">
                                     {isAutomationEnabled ? <ToggleRight className="text-green-600"/> : <ToggleLeft />}
                                     {isAutomationEnabled ? 'Otomasyon Aktif' : 'Otomasyon Pasif'}
                                </Label>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">Botların otomatik içerik paylaşmasını ve etkileşimde bulunmasını durdurur veya başlatır.</p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Başlangıç Botlarını Oluştur</CardTitle>
                            <CardDescription>
                                Bu işlem, sisteme 8 adet (6 kadın, 2 erkek) başlangıç botu ekler. Bu işlemi sadece bir kez çalıştırmanız önerilir.
                            </CardDescription>
                        </CardHeader>
                        <CardFooter>
                            <Button onClick={handleCreateBots} disabled={isCreating}>
                                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                                {isCreating ? 'Oluşturuluyor...' : '8 Bot Oluştur'}
                            </Button>
                        </CardFooter>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Manuel Bot Tetikleyici</CardTitle>
                            <CardDescription>Botları manuel olarak tetikleyerek anında içerik veya etkileşim oluşturun.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                           <Button onClick={() => handleManualTrigger('post_text')} disabled={isTesting}>
                                {isTesting && testingType === 'post_text' ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileText className="h-4 w-4"/>}
                                <span className="ml-2">Metin</span>
                            </Button>
                             <Button onClick={() => handleManualTrigger('post_image')} disabled={isTesting}>
                                {isTesting && testingType === 'post_image' ? <Loader2 className="h-4 w-4 animate-spin"/> : <ImageIcon className="h-4 w-4"/>}
                                <span className="ml-2">Görsel</span>
                            </Button>
                            <Button onClick={() => handleManualTrigger('post_video')} disabled={isTesting} className="sm:col-span-2">
                                {isTesting && testingType === 'post_video' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Video className="h-4 w-4"/>}
                                <span className="ml-2">Video (Surf)</span>
                            </Button>
                             <Button onClick={() => handleManualTrigger('like')} disabled={isTesting} variant="outline">
                                {isTesting && testingType === 'like' ? <Loader2 className="h-4 w-4 animate-spin"/> : <Heart className="h-4 w-4"/>}
                                <span className="ml-2">Beğeni</span>
                            </Button>
                             <Button onClick={() => handleManualTrigger('comment')} disabled={isTesting} variant="outline">
                                {isTesting && testingType === 'comment' ? <Loader2 className="h-4 w-4 animate-spin"/> : <MessageCircle className="h-4 w-4"/>}
                                <span className="ml-2">Yorum</span>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3">
                                <History className="h-6 w-6 text-primary"/>
                                Son Bot Aktiviteleri
                            </CardTitle>
                             <CardDescription>Botların gerçekleştirdiği son eylemler.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <BotActivityFeed />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
