// src/app/(main)/create-surf/page.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
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

function CreateSurfPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  
  const [text, setText] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('video/')) {
        toast({ variant: 'destructive', description: 'Lütfen bir video dosyası seçin.' });
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({ variant: 'destructive', description: 'Video boyutu 50MB\'dan büyük olamaz.' });
        return;
      }
      setVideoFile(file);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(URL.createObjectURL(file));
    }
  };

  const handleShare = async () => {
    if (!user || !userData) { toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' }); return; }
    if (!videoFile) { toast({ variant: 'destructive', description: 'Lütfen bir video seçin.' }); return; }

    setIsProcessing(true);

    try {
      setUploadProgress(0);

      const storagePath = `upload/videos/${user.uid}/${Date.now()}_${videoFile.name}`;
      const videoRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(videoRef, videoFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          setUploadProgress(progress);
        }, 
        (error) => { throw error; },
        async () => {
          try {
              const videoUrl = await getDownloadURL(uploadTask.snapshot.ref);
              await createPost({
                  uid: user.uid, username: userData.username, userPhotoURL: userData.photoURL || null,
                  userAvatarFrame: userData.selectedAvatarFrame || '', userRole: userData.role || 'user',
                  userGender: userData.gender, text: text, videoUrl: videoUrl, imageUrl: '',
                  language: i18n.language,
              });
      
              toast({ title: "Başarıyla Paylaşıldı!", description: "Videonuz Surf akışında görünecektir." });
              router.push('/surf');
          } catch (error: any) {
              toast({ variant: 'destructive', title: 'Bir Hata Oluştu', description: error.message || 'Videonuz paylaşılamadı.' });
          } finally {
              setIsProcessing(false);
          }
        }
      );
    } catch (error: any) {
      console.error("Share error:", error);
      toast({ variant: 'destructive', title: 'Hata', description: error.message || 'Video işlenirken bir hata oluştu.' });
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col min-h-full p-4">
       <div className="flex items-center justify-between mb-4">
          <Button asChild variant="ghost">
            <Link href="/create"><ChevronLeft className="mr-2 h-4 w-4" /> Geri</Link>
          </Button>
          <Button onClick={handleShare} disabled={isProcessing || !videoFile} className="">
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4"/>}
            {isProcessing ? 'Yükleniyor...' : 'Paylaş'}
          </Button>
      </div>

      <div className="flex-1 flex flex-col gap-6 items-start">
        <div className="w-full space-y-4">
          {videoPreview ? (
              <div className="relative group">
                  <video src={videoPreview} key={videoPreview} controls className="w-full rounded-lg bg-black"></video>
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => { setVideoFile(null); setVideoPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={isProcessing}>
                      <X className="h-4 w-4" />
                  </Button>
              </div>
          ) : (
              <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center justify-center h-48 border-2 border-dashed rounded-lg hover:border-primary transition-colors" disabled={isProcessing}>
                  <Clapperboard className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-2 text-sm text-muted-foreground">Video seçmek için tıkla</p>
                  <p className="text-xs text-muted-foreground">(Maks. 50MB)</p>
              </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="video/*" className="hidden" />

          <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Videona bir başlık ekle..." maxLength={200} disabled={isProcessing} />
          
          {isProcessing && (
              <div className="space-y-1">
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-center text-muted-foreground">Yükleniyor... %{Math.round(uploadProgress)}</p>
              </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CreateSurfPage;