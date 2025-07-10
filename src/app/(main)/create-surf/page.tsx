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
import { Loader2, Clapperboard, X, Send, ChevronLeft, Music, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import dynamic from 'next/dynamic';

const royaltyFreeMusic = [
  { title: "Upbeat Funk", url: "https://cdn.pixabay.com/download/audio/2022/08/04/audio_2bbe6a8d0a.mp3" },
  { title: "Chill Lofi", url: "https://cdn.pixabay.com/download/audio/2022/02/10/audio_b42e7c4f75.mp3" },
  { title: "Inspiring Cinematic", url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_88c382fbb2.mp3" },
  { title: "Happy Whistle", url: "https://cdn.pixabay.com/download/audio/2022/06/14/audio_f5d13d7f95.mp3" },
  { title: "Epic Adventure", url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_511b816a75.mp3" }
];

function CreateSurfPage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  
  const [text, setText] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [selectedMusic, setSelectedMusic] = useState<{ title: string; url: string } | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const ffmpegRef = useRef(new FFmpeg());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false);

  useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      if (ffmpeg.loaded) {
          setFfmpegLoaded(true);
          return;
      }
      ffmpeg.on('log', ({ message }) => {
        console.log(message);
      });
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      setFfmpegLoaded(true);
    };
    loadFfmpeg();
  }, []);

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
      setSelectedMusic(null); // Reset music selection on new video
    }
  };

  const handleShare = async () => {
    if (!user || !userData) { toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' }); return; }
    if (!videoFile) { toast({ variant: 'destructive', description: 'Lütfen bir video seçin.' }); return; }
    if (!ffmpegLoaded) { toast({ variant: 'destructive', description: 'Video işlemcisi henüz hazır değil, lütfen bir saniye bekleyin.' }); return; }

    setIsProcessing(true);
    let finalVideoBlob: Blob = videoFile;

    try {
      if (selectedMusic) {
        setProcessingMessage('Müzik videoya ekleniyor...');
        const ffmpeg = ffmpegRef.current;
        await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
        await ffmpeg.writeFile('audio.mp3', await fetchFile(selectedMusic.url));
        await ffmpeg.exec(['-i', 'input.mp4', '-i', 'audio.mp3', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.mp4']);
        const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
        finalVideoBlob = new Blob([data.buffer], { type: 'video/mp4' });
      }

      setProcessingMessage('Video sunucuya yükleniyor...');
      setUploadProgress(0);

      const storagePath = `upload/posts/videos/${user.uid}/${Date.now()}_${videoFile.name}`;
      const videoRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(videoRef, finalVideoBlob);

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
                  uid: user.uid, username: userData.username, userAvatar: userData.photoURL || null,
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
            {isProcessing ? 'İşleniyor...' : 'Paylaş'}
          </Button>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/2 space-y-4">
          {videoPreview ? (
              <div className="relative group">
                  <video src={videoPreview} key={videoPreview} controls className="w-full rounded-lg bg-black"></video>
                  <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={() => { setVideoFile(null); setVideoPreview(null); setSelectedMusic(null); if (fileInputRef.current) fileInputRef.current.value = ""; }} disabled={isProcessing}>
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
                  <p className="text-xs text-center text-muted-foreground">{processingMessage} %{Math.round(uploadProgress)}</p>
              </div>
          )}
        </div>

        <div className="w-full md:w-1/2">
            <h3 className="font-bold mb-2">Müzik Ekle</h3>
            <ScrollArea className="h-96 rounded-md border p-2">
                <div className="space-y-2">
                    {royaltyFreeMusic.map(music => (
                        <button key={music.title} onClick={() => setSelectedMusic(music)} disabled={!videoFile || isProcessing} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-secondary rounded-md"><Music className="h-5 w-5"/></div>
                                <span className="text-sm font-medium">{music.title}</span>
                            </div>
                            {selectedMusic?.url === music.url && <CheckCircle className="h-5 w-5 text-primary"/>}
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
      </div>
    </div>
  );
}

// Since ffmpeg.wasm is not compatible with SSR, we disable SSR for this page.
export default dynamic(() => Promise.resolve(CreateSurfPage), {
  ssr: false,
});
