// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { generateAvatar } from '@/ai/flows/generateAvatarFlow';
import { photoToAvatar } from '@/ai/flows/photoToAvatarFlow';
import { updateUserProfile } from '@/lib/actions/userActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Wand2, Upload, Camera, Sparkles, User } from 'lucide-react';
import Image from 'next/image';
import ImageCropperDialog from '@/components/common/ImageCropperDialog';

export default function AvatarStudioPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [description, setDescription] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [photoAvatar, setPhotoAvatar] = useState<string | null>(null);
  const fileInputRef = useState<React.RefObject<HTMLInputElement>>(null);


  const handleGenerate = async () => {
    if (!user || !userData) return;
    if (!description.trim()) {
      toast({ variant: 'destructive', description: 'Lütfen bir avatar açıklaması girin.' });
      return;
    }
    setIsGenerating(true);
    setGeneratedImage(null);
    try {
      const result = await generateAvatar({
        description: description,
        gender: userData.gender || 'neutral',
      });
      if (!result.photoDataUri) throw new Error("Yapay zeka bir resim oluşturamadı.");
      setGeneratedImage(result.photoDataUri);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: error.message });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePhotoToAvatar = async () => {
    if (!user || !croppedImage) return;
    setIsGenerating(true);
    setPhotoAvatar(null);
    try {
        const result = await photoToAvatar({photoDataUri: croppedImage});
        if (!result.photoDataUri) throw new Error("Yapay zeka bir avatar oluşturamadı.");
        setPhotoAvatar(result.photoDataUri);
    } catch(e: any) {
        toast({variant: "destructive", title: "Hata", description: e.message});
    } finally {
        setIsGenerating(false);
    }
  }

  const handleSetAvatar = async (imageDataUrl: string) => {
    if (!user || !imageDataUrl) return;
    setIsUploading(true);
    try {
      await updateUserProfile({
        userId: user.uid,
        avatarSvg: null, // Clear old SVG if exists
        photoURL: imageDataUrl, // Pass data URL to be uploaded by server action
      });
      toast({ title: "Başarılı!", description: "Yeni avatarınız ayarlandı." });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: "Avatar ayarlanırken bir hata oluştu." });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) { 
          toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Resim boyutu 10MB'dan büyük olamaz." });
          return;
      }
      const reader = new FileReader();
      reader.onload = () => {
          setImageToCrop(reader.result as string);
      };
      reader.readAsDataURL(e.target.files[0]);
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

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate"><Wand2 className="mr-2 h-4 w-4"/> Metinden Oluştur</TabsTrigger>
          <TabsTrigger value="transform"><Camera className="mr-2 h-4 w-4"/> Fotoğraftan Dönüştür</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Avatarını Tarif Et</CardTitle>
              <CardDescription>Hayalindeki avatarı birkaç kelimeyle anlat, yapay zeka senin için çizsin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Örn: Mavi saçlı, gözlüklü, gülümseyen bir astronot kedi."
                disabled={isGenerating}
              />
              {generatedImage && (
                <div className="p-2 border rounded-lg bg-muted flex justify-center">
                    <Image src={generatedImage} alt="Oluşturulan Avatar" width={256} height={256} className="rounded-md" />
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-between">
              <Button onClick={handleGenerate} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                Oluştur
              </Button>
              {generatedImage && (
                <Button onClick={() => handleSetAvatar(generatedImage)} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4"/>}
                  Avatar Olarak Ayarla
                </Button>
              )}
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="transform" className="mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Fotoğrafını Dönüştür</CardTitle>
                    <CardDescription>Bir fotoğrafını yükle, yapay zeka onu sanatsal bir avatara çevirsin.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                    {!croppedImage && (
                        <Button variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
                           <Upload className="mr-2 h-4 w-4"/> Fotoğraf Yükle
                        </Button>
                    )}
                    
                    {croppedImage && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                             <div className="p-2 border rounded-lg bg-muted flex justify-center">
                                <Image src={croppedImage} alt="Kırpılmış Fotoğraf" width={256} height={256} className="rounded-md" />
                            </div>
                            <div className="p-2 border rounded-lg bg-muted flex justify-center items-center h-[272px]">
                                {isGenerating ? <Loader2 className="h-8 w-8 animate-spin"/> : photoAvatar ? <Image src={photoAvatar} alt="Dönüştürülmüş Avatar" width={256} height={256} className="rounded-md" /> : <p className="text-sm text-muted-foreground">Sonuç burada görünecek</p>}
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="justify-between">
                    <div>
                         {croppedImage && (
                            <Button onClick={handlePhotoToAvatar} disabled={isGenerating}>
                                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Wand2 className="mr-2 h-4 w-4"/>}
                                Dönüştür
                            </Button>
                        )}
                    </div>
                     {photoAvatar && (
                        <Button onClick={() => handleSetAvatar(photoAvatar)} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4"/>}
                        Avatar Olarak Ayarla
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </TabsContent>
      </Tabs>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        setIsOpen={setImageToCrop}
        imageSrc={imageToCrop}
        onCropComplete={setCroppedImage}
        aspectRatio={1}
        circularCrop={true}
       />
    </div>
  );
}
