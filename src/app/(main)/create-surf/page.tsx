// src/app/(main)/create-surf/page.tsx
'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { createPost } from '@/lib/actions/postActions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Clapperboard, X, Send, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';

export default function CreateSurfPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  
  const [text, setText] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({ variant: 'destructive', description: 'Lütfen bir video dosyası seçin.' });
        return;
      }
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        toast({ variant: 'destructive', description: 'Video boyutu 50MB\'dan büyük olamaz.' });
        return;
      }
      setVideoFile(file);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleShare = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' });
      return;
    }
    if (!videoFile) {
      toast({ variant: 'destructive', description: 'Lütfen bir video seçin.' });
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);

    const storagePath = `upload/posts/videos/${user.uid}/${Date.now()}_${videoFile.name}`;
    const videoRef = ref(storage, storagePath);
    const uploadTask = uploadBytesResumable(videoRef, videoFile);

    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        setUploadProgress(progress);
      }, 
      (error) => {
        console.error("Upload error:", error);
        toast({ 
          variant: 'destructive', 
          title: 'Yükleme Hatası', 
          description: 'Video yüklenirken bir hata oluştu: ' + error.message,
        });
        setIsSubmitting(false);
      },
      async () => {
        try {
            const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);

            await createPost({
                uid: user.uid,
                username: userData.username,
                userAvatar: userData.photoURL || null,
                userAvatarFrame: userData.selectedAvatarFrame || '',
                userRole: userData.role || 'user',
                userGender: userData.gender,
                text: text,
                videoUrl: videoUrl,
                imageUrl: '',
                language: i18n.language,
            });
    
            toast({ title: "Başarıyla Paylaşıldı!", description: "Videonuz Surf akışında görünecektir." });
            router.push('/surf');
        } catch (error: any) {
            toast({ 
                variant: 'destructive', 
                title: 'Bir Hata Oluştu', 
                description: error.message || 'Videonuz paylaşılamadı.', 
            });
        } finally {
            setIsSubmitting(false);
            setUploadProgress(0);
        }
      }
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 relative">
       <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4 md:left-8 md:top-8 rounded-full"
      >
        <Link href="/create">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Geri
        </Link>
      </Button>
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
            <h1 className="text-2xl font-bold">Surf Videosu Yükle</h1>
            <p className="text-muted-foreground">Kısa bir video ve başlık ekleyerek paylaş.</p>
        </div>

        {videoPreview ? (
            <div className="relative group">
                <video src={videoPreview} controls className="w-full rounded-lg bg-black"></video>
                <Button 
                    variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" 
                    onClick={() => { setVideoFile(null); setVideoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                    disabled={isSubmitting}
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        ) : (
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg hover:border-primary transition-colors"
                disabled={isSubmitting}
            >
                <Clapperboard className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">Video seçmek için tıkla</p>
                <p className="text-xs text-muted-foreground">(Maks. 50MB)</p>
            </button>
        )}
        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />

        <Textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Videona bir başlık ekle..."
            maxLength={200}
            disabled={isSubmitting}
        />
        
        {isSubmitting && (
            <div className="space-y-1">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-center text-muted-foreground">Yükleniyor... %{Math.round(uploadProgress)}</p>
            </div>
        )}

        <Button onClick={handleShare} disabled={isSubmitting || !videoFile} className="w-full">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}
        </Button>
      </div>
    </div>
  );
}
