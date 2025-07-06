'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL, uploadBytesResumable } from 'firebase/storage';
import { createPost } from '@/lib/actions/postActions';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Send, Loader2, X, Video, UploadCloud } from 'lucide-react';
import { Progress } from '../ui/progress';

export default function NewVideoForm() {
    const router = useRouter();
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const { i18n } = useTranslation();
    
    const [text, setText] = useState("");
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreview, setVideoPreview] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('video/')) {
                toast({ variant: 'destructive', description: 'Lütfen bir video dosyası seçin.' });
                return;
            }
            if (file.size > 100 * 1024 * 1024) { // 100MB limit
                toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Video boyutu 100MB'dan büyük olamaz." });
                return;
            }
            setVideoFile(file);
            setVideoPreview(URL.createObjectURL(file));
        }
    };
    
    const removeVideo = () => {
        setVideoFile(null);
        if (videoPreview) {
            URL.revokeObjectURL(videoPreview);
            setVideoPreview(null);
        }
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    }

    const handleShare = async () => {
        if (!user || !userData) {
            toast({ variant: 'destructive', description: 'Bu işlemi yapmak için giriş yapmalısınız.' });
            return;
        }
        if (!videoFile) {
            toast({ variant: 'destructive', description: 'Lütfen bir video dosyası seçin.' });
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);

        try {
            const videoRef = ref(storage, `upload/videos/${user.uid}/${Date.now()}_${videoFile.name}`);
            const uploadTask = uploadBytesResumable(videoRef, videoFile);

            uploadTask.on('state_changed', 
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(progress);
                },
                (error) => {
                    console.error("Video yüklenirken hata:", error);
                    toast({ variant: 'destructive', title: 'Yükleme Hatası', description: 'Video yüklenirken bir sorun oluştu.' });
                    setIsSubmitting(false);
                },
                async () => {
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
                        language: i18n.language,
                    });

                    toast({ title: "Başarıyla Paylaşıldı!", description: "Videonuz ana sayfada görünecektir." });
                    router.push('/home');
                }
            );

        } catch (error: any) {
            console.error("Gönderi paylaşılırken hata:", error);
            toast({ variant: 'destructive', title: 'Bir Hata Oluştu', description: error.message || 'Gönderiniz paylaşılamadı.' });
            setIsSubmitting(false);
        }
    };
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video /> Video Paylaş</CardTitle>
                <CardDescription>Bir video ve başlık ekleyerek anını paylaş.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {videoPreview ? (
                    <div className="relative">
                        <video src={videoPreview} controls className="w-full rounded-lg max-h-96 bg-black" />
                        <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-8 w-8 rounded-full z-10" onClick={removeVideo} disabled={isSubmitting}>
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                ) : (
                    <>
                        <input type="file" ref={fileInputRef} onChange={handleVideoChange} accept="video/*" className="hidden" />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg hover:border-primary hover:bg-muted transition-colors"
                        >
                            <UploadCloud className="h-10 w-10 text-muted-foreground mb-2" />
                            <span className="font-semibold">Video seçmek için tıkla</span>
                            <span className="text-xs text-muted-foreground mt-1">Maksimum 100MB</span>
                        </button>
                    </>
                )}

                <Textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Videon için bir açıklama yaz..."
                    disabled={isSubmitting}
                />
                
                {isSubmitting && (
                    <div className="space-y-2">
                         <Progress value={uploadProgress} />
                         <p className="text-sm text-center text-muted-foreground">{uploadProgress < 100 ? `Yükleniyor: ${Math.round(uploadProgress)}%` : 'İşleniyor...'}</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button className="w-full" onClick={handleShare} disabled={isSubmitting || !videoFile}>
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Paylaş
                </Button>
            </CardFooter>
        </Card>
    );
}
