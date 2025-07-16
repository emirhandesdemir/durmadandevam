// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Sparkles, Upload, FileText, Wand, ArrowLeft, RefreshCcw, Save } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { generateAvatar, GenerateAvatarInput } from '@/ai/flows/generateAvatarFlow';
import { photoToAvatar, PhotoToAvatarInput } from '@/ai/flows/photoToAvatarFlow';
import { styleImage, StyleImageInput } from '@/ai/flows/imageStyleFlow';
import ImageCropperDialog from '@/components/common/ImageCropperDialog';
import { updateUserProfile } from '@/lib/actions/userActions';

export default function AvatarStudioPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [avatar, setAvatar] = useState<string | null>(userData?.photoURL || null);
  const [originalAvatar, setOriginalAvatar] = useState<string | null>(userData?.photoURL || null);
  const [textPrompt, setTextPrompt] = useState('');
  const [stylePrompt, setStylePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleGenerateFromText = async () => {
    if (!textPrompt.trim()) {
      toast({ variant: 'destructive', description: 'Lütfen bir avatar açıklaması girin.' });
      return;
    }
    setIsLoading(true);
    try {
      const input: GenerateAvatarInput = { prompt: textPrompt };
      const result = await generateAvatar(input);
      setAvatar(result.avatarDataUri);
      setOriginalAvatar(result.avatarDataUri);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Avatar oluşturulamadı.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', description: 'Lütfen bir resim dosyası seçin.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedDataUrl: string) => {
    setImageToCrop(null);
    setIsLoading(true);
    toast({ description: "Fotoğrafınız avatara dönüştürülüyor..." });
    try {
        const input: PhotoToAvatarInput = { photoDataUri: croppedDataUrl };
        const result = await photoToAvatar(input);
        setAvatar(result.avatarDataUri);
        setOriginalAvatar(result.avatarDataUri);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Avatar oluşturulamadı.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleApplyStyle = async () => {
    if (!avatar || !stylePrompt.trim()) return;
    setIsLoading(true);
    try {
        const input: StyleImageInput = { photoDataUri: avatar, style: stylePrompt };
        const result = await styleImage(input);
        setAvatar(result.styledPhotoDataUri);
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Stil uygulanamadı.' });
    } finally {
        setIsLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!user || !avatar) {
        toast({ variant: 'destructive', description: 'Kaydedilecek bir avatar yok.'});
        return;
    }
    setIsSaving(true);
    try {
        await updateUserProfile({ userId: user.uid, photoURL: avatar });
        toast({ description: 'Yeni avatarınız başarıyla kaydedildi!' });
        router.push('/profile');
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Avatar kaydedilemedi.' });
    } finally {
        setIsSaving(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-4 flex items-center justify-between border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Avatar Stüdyosu</h1>
        <Button onClick={handleSaveChanges} disabled={isLoading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
            Kaydet
        </Button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-6">
        <div className="flex justify-center">
          <div className="relative w-48 h-48">
            {isLoading ? (
                <div className="w-full h-full bg-muted rounded-full flex items-center justify-center">
                    <Loader2 className="h-12 w-12 text-primary animate-spin" />
                </div>
            ) : (
                <Avatar className="w-full h-full border-4 border-primary shadow-lg">
                    <AvatarImage src={avatar || undefined} />
                    <AvatarFallback className="text-6xl">{userData?.username.charAt(0)}</AvatarFallback>
                </Avatar>
            )}
            {avatar && avatar !== originalAvatar && (
                 <Button variant="ghost" size="icon" className="absolute top-0 right-0 bg-background/50 rounded-full" onClick={() => setAvatar(originalAvatar)}>
                    <RefreshCcw className="h-5 w-5"/>
                 </Button>
            )}
          </div>
        </div>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary"/> Stil Ver</CardTitle>
                <CardDescription>Mevcut avatarına yeni özellikler ekle veya stilini değiştir.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Input
                    placeholder="Gözlük ekle, saçını sarı yap..."
                    value={stylePrompt}
                    onChange={(e) => setStylePrompt(e.target.value)}
                    disabled={!avatar || isLoading}
                />
                <Button onClick={handleApplyStyle} disabled={!avatar || isLoading || !stylePrompt.trim()}>
                    <Wand className="mr-2 h-4 w-4" />
                    Uygula
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary"/> Metinden Oluştur</CardTitle>
                <CardDescription>Hayalindeki avatarı birkaç kelimeyle tarif et.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
                <Textarea
                    placeholder="Mavi saçlı, gözlüklü bir kedi..."
                    value={textPrompt}
                    onChange={(e) => setTextPrompt(e.target.value)}
                    disabled={isLoading}
                    rows={1}
                />
                <Button onClick={handleGenerateFromText} disabled={isLoading || !textPrompt.trim()}>
                    <Sparkles className="mr-2 h-4 w-4"/>
                    Oluştur
                </Button>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5 text-primary"/> Fotoğraf Yükle</CardTitle>
                <CardDescription>Kendi fotoğrafını yükleyerek onu bir avatara dönüştür.</CardDescription>
            </CardHeader>
            <CardContent>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                <Button className="w-full" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                    <Upload className="mr-2 h-4 w-4"/>
                    Fotoğraf Seç
                </Button>
            </CardContent>
        </Card>

        <ImageCropperDialog
          isOpen={!!imageToCrop}
          setIsOpen={(open) => !open && setImageToCrop(null)}
          imageSrc={imageToCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={1}
          circularCrop={true}
        />
      </main>
    </div>
  );
}
