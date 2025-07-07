'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createStory } from '@/lib/actions/storyActions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Send, ImagePlus, Loader2, Video } from 'lucide-react';
import Link from 'next/link';

export default function CreateStoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) { // 20MB limit
      toast({
        variant: 'destructive',
        description: "Dosya boyutu 20MB'dan büyük olamaz."
      });
      return;
    }
    
    setMediaType(file.type.startsWith('image') ? 'image' : 'video');
    setMediaFile(file);
    setMediaPreview(URL.createObjectURL(file));
  };

  const handleShareStory = async () => {
    if (!user || !mediaFile || !mediaPreview) return;
    setIsSubmitting(true);
    
    const reader = new FileReader();
    reader.readAsDataURL(mediaFile);
    reader.onloadend = async () => {
        const base64data = reader.result as string;
        try {
            await createStory(user.uid, base64data, mediaType!);
            toast({ description: "Hikayen başarıyla paylaşıldı!" });
            router.push('/home');
        } catch (error: any) {
            toast({ variant: 'destructive', description: `Hikaye paylaşılamadı: ${error.message}` });
            setIsSubmitting(false);
        }
    };
    reader.onerror = () => {
        toast({ variant: 'destructive', description: "Dosya okunurken bir hata oluştu." });
        setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex h-full flex-col items-center justify-center p-4 bg-muted">
      <Button asChild variant="ghost" className="absolute left-4 top-4 rounded-full z-10">
        <Link href="/home">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Geri
        </Link>
      </Button>
      <Card className="w-full max-w-sm aspect-[9/16] flex flex-col items-center justify-center p-4 shadow-xl bg-background">
        {mediaPreview ? (
          <div className="relative w-full h-full rounded-lg overflow-hidden">
            {mediaType === 'image' ? (
                <img src={mediaPreview} alt="Hikaye önizleme" className="w-full h-full object-cover"/>
            ) : (
                <video src={mediaPreview} loop autoPlay muted className="w-full h-full object-cover" />
            )}
            <div className="absolute bottom-4 left-4 right-4">
                 <Button className="w-full text-lg" onClick={handleShareStory} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                    Hikayeyi Paylaş
                </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-4 text-muted-foreground hover:text-primary transition-colors">
                <div className="border-4 border-dashed rounded-full p-8">
                     <ImagePlus className="h-16 w-16" />
                </div>
                <h2 className="text-xl font-bold">Hikaye Yükle</h2>
                <p>Resim veya video seçin</p>
            </button>
          </div>
        )}
      </Card>
    </main>
  );
}
