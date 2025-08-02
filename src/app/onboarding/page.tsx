// src/app/onboarding/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2, User, Sparkles, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { updateUserProfile } from '@/lib/actions/userActions';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { v4 as uuidv4 } from 'uuid';
import multiavatar from '@multiavatar/multiavatar';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export default function OnboardingPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    
    // State for all fields
    const [isSaving, setIsSaving] = useState(false);
    const [avatarId, setAvatarId] = useState('');
    const [bio, setBio] = useState('');
    const [age, setAge] = useState<number | string>('');
    const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
    const [interests, setInterests] = useState<string[]>([]);
    const [currentInterest, setCurrentInterest] = useState('');

    useEffect(() => {
        if (userData) {
            setAvatarId(userData.username || uuidv4());
            setBio(userData.bio || '');
            setAge(userData.age || '');
            setGender(userData.gender || undefined);
            setInterests(userData.interests || []);
        }
    }, [userData]);

    const avatarSvg = useMemo(() => {
        if (!avatarId) return '';
        return multiavatar(avatarId);
    }, [avatarId]);

    const handleRandomizeAvatar = () => {
        setAvatarId(uuidv4());
    };

    const handleAddInterest = () => {
        const newInterest = currentInterest.trim();
        if (newInterest && !interests.includes(newInterest) && interests.length < 10) {
            setInterests([...interests, newInterest]);
            setCurrentInterest('');
        }
    };

    const handleRemoveInterest = (interestToRemove: string) => {
        setInterests(interests.filter(i => i !== interestToRemove));
    };

    const handleSaveAndContinue = async () => {
        if (!user) return;
        
        if (!bio || !age || !gender || interests.length === 0) {
             toast({
                variant: 'destructive',
                title: "Eksik Bilgiler",
                description: "Devam etmeden önce lütfen tüm alanları doldurun.",
            });
            return;
        }

        setIsSaving(true);
        try {
            const avatarDataUrl = `data:image/svg+xml;base64,${btoa(avatarSvg)}`;
            
            await updateUserProfile({
                userId: user.uid,
                photoURL: avatarDataUrl,
                bio,
                age: Number(age),
                gender,
                interests,
            });

            toast({
                title: "Harika!",
                description: "Profiliniz oluşturuldu. Şimdi maceraya başlayabilirsiniz.",
            });

            router.push('/home');

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: "Hata",
                description: "Profil kaydedilirken bir hata oluştu: " + error.message,
            });
        } finally {
            setIsSaving(false);
        }
    };

    if (authLoading) {
        return <AnimatedLogoLoader fullscreen />;
    }

    if (!user || !userData) {
        router.replace('/login');
        return <AnimatedLogoLoader fullscreen />;
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
            <Card className="w-full max-w-lg animate-in fade-in-50 duration-500">
                <CardHeader className="text-center">
                    <CardTitle className="text-3xl font-bold">Harika bir başlangıç yapalım!</CardTitle>
                    <CardDescription>Profilini tamamla ve seni yansıtan bir avatar seç.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar Section */}
                    <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                        <h3 className="text-lg font-semibold text-center flex items-center justify-center gap-2"><Sparkles className="text-primary h-5 w-5"/>Avatarını Oluştur</h3>
                        <div
                            className="w-32 h-32 mx-auto bg-gray-200 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg"
                            dangerouslySetInnerHTML={{ __html: avatarSvg }}
                        />
                         <div className="space-y-2">
                            <Input
                            placeholder="Avatarınız için bir metin girin..."
                            value={avatarId}
                            onChange={(e) => setAvatarId(e.target.value)}
                            className="text-center"
                            />
                        </div>
                        <Button variant="outline" onClick={handleRandomizeAvatar} className="w-full">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Rastgele Oluştur
                        </Button>
                    </div>
                    
                    {/* Profile Info Section */}
                     <div className="space-y-4 p-4 rounded-lg border">
                         <h3 className="text-lg font-semibold text-center flex items-center justify-center gap-2"><User className="text-primary h-5 w-5"/>Profil Bilgileri</h3>
                         <div className="space-y-2">
                            <Label htmlFor="bio">Biyografi</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini birkaç kelimeyle anlat..." maxLength={150} />
                        </div>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-2">
                               <Label htmlFor="age">Yaş</Label>
                               <Input id="age" type="number" value={age || ''} onChange={(e) => setAge(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cinsiyet</Label>
                                <RadioGroup value={gender} onValueChange={(value: "male" | "female") => setGender(value)} className="flex space-x-4 pt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Erkek</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Kadın</Label></div>
                                </RadioGroup>
                            </div>
                        </div>
                          <div className="space-y-2">
                            <Label htmlFor="interests">İlgi Alanlarım (En fazla 10)</Label>
                             <div className="flex gap-2">
                                <Input 
                                    id="interests" 
                                    value={currentInterest} 
                                    onChange={(e) => setCurrentInterest(e.target.value)} 
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                                    placeholder="örn: Müzik, Spor, Kitap..."
                                />
                                <Button type="button" onClick={handleAddInterest}>Ekle</Button>
                            </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {interests.map(interest => (
                                    <div key={interest} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                                        {interest}
                                        <button onClick={() => handleRemoveInterest(interest)} className="ml-1 text-muted-foreground hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    <Button onClick={handleSaveAndContinue} disabled={isSaving} size="lg" className="w-full">
                        {isSaving ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <Save className="mr-2 h-5 w-5" />
                        )}
                        Kaydet ve Maceraya Başla
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
