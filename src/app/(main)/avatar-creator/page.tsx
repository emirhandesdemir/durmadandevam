// src/app/(main)/avatar-creator/page.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Sparkles, Wand } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/actions/userActions';
import { emojiToDataUrl } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

import AvatarPreview from '@/components/avatar-creator/AvatarPreview';
import CategoryTabs from '@/components/avatar-creator/CategoryTabs';
import type { AvatarState } from '@/components/avatar-creator/types';
import { styleImage } from '@/ai/flows/imageStyleFlow';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const initialMaleState: AvatarState = {
    gender: 'male',
    skinColor: '#F2C8AD',
    hair: { style: 'short', color: '#2C1B10' },
    eyes: { style: 'normal', color: '#5A3825' },
    eyebrows: { style: 'normal' },
    nose: { style: 'normal' },
    mouth: { style: 'normal' },
    facialHair: { style: 'none' },
};

const initialFemaleState: AvatarState = {
    gender: 'female',
    skinColor: '#F2C8AD',
    hair: { style: 'long', color: '#2C1B10' },
    eyes: { style: 'normal', color: '#5A3825' },
    eyebrows: { style: 'normal' },
    nose: { style: 'normal' },
    mouth: { style: 'normal' },
    facialHair: { style: 'none' },
};

export default function AvatarCreatorPage() {
    const router = useRouter();
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [avatarState, setAvatarState] = useState<AvatarState>(initialMaleState);
    const [isSaving, setIsSaving] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);
    
    // This will hold the rendered SVG as a string
    const [svgString, setSvgString] = useState('');

    const handleSaveChanges = async () => {
        if (!user || !svgString) {
            toast({ variant: 'destructive', description: 'Kaydedilecek bir avatar yok veya kullanıcı bilgisi eksik.' });
            return;
        }

        setIsSaving(true);
        try {
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
            await updateUserProfile({ userId: user.uid, photoURL: dataUrl });
            toast({ description: 'Yeni avatarınız başarıyla kaydedildi!' });
            router.push('/profile');
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Avatar kaydedilemedi.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleApplyAiStyle = async () => {
        if (!svgString || !aiPrompt.trim()) return;
        setIsAiLoading(true);
        try {
            const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
            const result = await styleImage({ photoDataUri: dataUrl, style: aiPrompt });
            // This is a bit tricky. We can't deconstruct the AI image back into SVG parts.
            // For now, let's just show a toast that this feature would be implemented differently.
            toast({ title: 'Yapay Zeka Düzenlemesi', description: 'Bu özellik, oluşturulan avatarı bir resme çevirip yapay zeka ile düzenler. Şimdilik bu demo akışı burada sonlanıyor.' });
        } catch(error: any) {
            toast({ variant: 'destructive', title: 'Yapay Zeka Hatası', description: error.message });
        } finally {
            setIsAiLoading(false);
        }
    };

    const handleGenderChange = (gender: 'male' | 'female') => {
        setAvatarState(gender === 'male' ? initialMaleState : initialFemaleState);
    };

    return (
        <div className="flex flex-col h-full bg-muted/30">
            <header className="flex items-center justify-between p-3 border-b bg-background">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft /></Button>
                <h1 className="text-lg font-semibold">Avatar Oluşturucu</h1>
                <Button onClick={handleSaveChanges} disabled={isSaving || isAiLoading}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Kaydet
                </Button>
            </header>

            <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 overflow-y-auto">
                <div className="flex flex-col items-center justify-center bg-background rounded-2xl p-4">
                    <div className="flex gap-2 mb-4">
                        <Button variant={avatarState.gender === 'male' ? 'secondary' : 'ghost'} onClick={() => handleGenderChange('male')}>Erkek</Button>
                        <Button variant={avatarState.gender === 'female' ? 'secondary' : 'ghost'} onClick={() => handleGenderChange('female')}>Kadın</Button>
                    </div>
                    <AvatarPreview avatarState={avatarState} setSvgString={setSvgString} />
                    <div className="w-full max-w-sm mt-4 p-4 rounded-lg border bg-muted/50 space-y-2">
                        <Label htmlFor="ai-prompt" className="font-semibold flex items-center gap-2"><Sparkles className="text-primary h-4 w-4"/> AI ile Stil Ver</Label>
                        <div className="flex gap-2">
                             <Input 
                                id="ai-prompt"
                                placeholder="Gözlük ekle, arka planı orman yap..." 
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                disabled={isAiLoading}
                            />
                            <Button onClick={handleApplyAiStyle} disabled={isAiLoading || !aiPrompt.trim()}>
                                {isAiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand className="h-4 w-4"/>}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="bg-background rounded-2xl p-2 md:p-4">
                    <CategoryTabs avatarState={avatarState} onStateChange={setAvatarState} />
                </div>
            </main>
        </div>
    );
}
