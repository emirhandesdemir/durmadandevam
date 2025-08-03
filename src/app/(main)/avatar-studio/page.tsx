// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/actions/userActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, User, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

// List of available Dicebear styles
const avatarStyles = [
  { id: 'adventurer', name: 'Macera' },
  { id: 'pixel-art', name: 'Piksel' },
  { id: 'initials', name: 'İlk Harfler' },
  { id: 'bottts', name: 'Botlar' },
  { id: 'micah', name: 'Micah' },
  { id: 'fun-emoji', name: 'Emoji' },
  { id: 'lorelei', name: 'Çizgi' },
  { id: 'identicon', name: 'Geo' },
  { id: 'notionists', name: 'Notion' },
  { id: 'miniavs', name: 'Minimalist' },
];

export default function AvatarStudioPage() {
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();

  const [selectedStyle, setSelectedStyle] = useState('adventurer');
  const [seed, setSeed] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Set initial seed from username when data is available
    if (userData?.username) {
        setSeed(userData.username);
    }
  }, [userData]);


  const generatedAvatarUrl = useMemo(() => {
    if (!seed) return '';
    return `https://api.dicebear.com/8.x/${selectedStyle}/svg?seed=${encodeURIComponent(seed)}`;
  }, [selectedStyle, seed]);
  
  const handleRandomize = () => {
    setSeed(Math.random().toString(36).substring(7));
  };


  const handleSetAvatar = async () => {
    if (!user || !generatedAvatarUrl) return;
    setIsSaving(true);
    try {
        await updateUserProfile({
            userId: user.uid,
            photoURL: generatedAvatarUrl,
        });
        await refreshUserData();
        toast({ title: "Başarılı!", description: "Yeni avatarınız ayarlandı." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: "Avatar ayarlanırken bir hata oluştu." });
    } finally {
        setIsSaving(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>;
  }

  return (
    <div className="container mx-auto max-w-2xl py-6">
        <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Avatar Stüdyosu</h1>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Avatarını Oluştur</CardTitle>
                <CardDescription>Tarzını seç, anında avatarını oluştur ve profil fotoğrafı olarak ayarla.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                {/* Preview Section */}
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                    <p className="text-sm font-medium text-muted-foreground">Önizleme</p>
                    <div className="p-4 border-2 border-dashed rounded-full bg-muted">
                       {generatedAvatarUrl ? (
                            <Image 
                                key={generatedAvatarUrl} // Force re-render on URL change
                                src={generatedAvatarUrl} 
                                alt="Oluşturulan Avatar" 
                                width={128} 
                                height={128} 
                                className="rounded-full bg-background" 
                            />
                       ) : (
                           <div className="h-32 w-32 rounded-full bg-background flex items-center justify-center">
                               <ImageIcon className="h-12 w-12 text-muted-foreground"/>
                           </div>
                       )}
                    </div>
                    <Button variant="outline" size="sm" onClick={handleRandomize}>
                        <RefreshCw className="mr-2 h-4 w-4"/>
                        Zarları Tekrar At
                    </Button>
                </div>

                {/* Style Selection */}
                <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Stil Seç</p>
                    <RadioGroup value={selectedStyle} onValueChange={setSelectedStyle}>
                        <ScrollArea className="h-64">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4">
                                {avatarStyles.map((style) => (
                                    <RadioGroupItem key={style.id} value={style.id} id={style.id} className="sr-only" />
                                ))}
                                {avatarStyles.map((style) => (
                                    <Label
                                        key={style.id}
                                        htmlFor={style.id}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 cursor-pointer hover:bg-accent hover:border-primary/50 transition-all",
                                            selectedStyle === style.id ? "border-primary bg-primary/10" : "border-muted"
                                        )}
                                    >
                                        <Image src={`https://api.dicebear.com/8.x/${style.id}/svg?seed=example`} alt={style.name} width={48} height={48} className="rounded-full bg-background" />
                                        <span className="text-xs font-semibold text-center">{style.name}</span>
                                    </Label>
                                ))}
                            </div>
                        </ScrollArea>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleSetAvatar} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4"/>}
                  Avatar Olarak Ayarla
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
