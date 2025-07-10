
// src/components/posts/NewPostForm.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/firebase";
import { ref, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { applyImageFilter } from "@/lib/actions/imageActions";
import { createPost } from "@/lib/actions/postActions";
import { getFollowingForSuggestions } from "@/lib/actions/userActions";
import type { UserProfile } from "@/lib/types";
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { Image as ImageIcon, Send, Loader2, X, Sparkles, RefreshCcw, Video, File, Clapperboard, Music, CheckCircle } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { Input } from "../ui/input";
import { useTranslation } from "react-i18next";
import { Progress } from "../ui/progress";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from "../ui/dialog";

const royaltyFreeMusic = [
  { title: "Upbeat Funk", url: "https://cdn.pixabay.com/download/audio/2022/08/04/audio_2bbe6a8d0a.mp3" },
  { title: "Chill Lofi", url: "https://cdn.pixabay.com/download/audio/2022/02/10/audio_b42e7c4f75.mp3" },
  { title: "Inspiring Cinematic", url: "https://cdn.pixabay.com/download/audio/2022/08/02/audio_88c382fbb2.mp3" },
  { title: "Happy Whistle", url: "https://cdn.pixabay.com/download/audio/2022/06/14/audio_f5d13d7f95.mp3" },
  { title: "Epic Adventure", url: "https://cdn.pixabay.com/download/audio/2022/10/25/audio_511b816a75.mp3" }
];


async function dataUriToBlob(dataUri: string): Promise<Blob> {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
}

export default function NewPostForm() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const { i18n } = useTranslation();
  const searchParams = useSearchParams();
  
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  
  // Image states
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [originalCroppedImage, setOriginalCroppedImage] = useState<string | null>(null); 
  const [isAiEditing, setIsAiEditing] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [wasEditedByAI, setWasEditedByAI] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Video states
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const ffmpegRef = useRef(new FFmpeg());
  const [isMusicDialogOpen, setIsMusicDialogOpen] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ title: string; url: string } | null>(null);

  
  // General states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Mention States
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
    useEffect(() => {
    const loadFfmpeg = async () => {
      const ffmpeg = ffmpegRef.current;
      if (!ffmpeg.loaded) {
        ffmpeg.on('log', ({ message }) => {
          console.log(message);
        });
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
      }
    };
    loadFfmpeg();
  }, []);

  useEffect(() => {
    const sharedTitle = searchParams.get('title');
    const sharedText = searchParams.get('text');
    const sharedUrl = searchParams.get('url');

    let initialText = '';
    if (sharedTitle) initialText += sharedTitle + '\n';
    if (sharedText) initialText += sharedText + '\n';
    if (sharedUrl) initialText += sharedUrl;

    if (initialText) setText(initialText.trim());
  }, [searchParams]);

  const fetchSuggestions = useCallback(async () => {
    if (!userData || suggestions.length > 0) return;
    setSuggestionLoading(true);
    try {
        const followingList = await getFollowingForSuggestions(userData.uid);
        setSuggestions(followingList);
    } catch (error) {
        console.error("Error fetching suggestions:", error);
    } finally {
        setSuggestionLoading(false);
    }
  }, [userData, suggestions.length]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setText(value);
    const cursorPos = e.target.selectionStart;
    const textUpToCursor = value.substring(0, cursorPos);
    const mentionMatch = textUpToCursor.match(/@(\w*)$/);
    if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        fetchSuggestions();
    } else {
        setMentionQuery(null);
    }
    setActiveSuggestionIndex(0);
  };

  const handleMentionSelect = (username: string) => {
    if (!textareaRef.current) return;
    const value = textareaRef.current.value;
    const cursorPos = textareaRef.current.selectionStart;
    const textUpToCursor = value.substring(0, cursorPos);
    const startIndex = textUpToCursor.lastIndexOf('@');
    if (startIndex === -1) return;
    const prefix = value.substring(0, startIndex);
    const suffix = value.substring(cursorPos);
    const newText = `${prefix}${username} ${suffix}`;
    setText(newText);
    setMentionQuery(null);
    const newCursorPos = prefix.length + username.length + 2;
    setTimeout(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const filteredSuggestions = mentionQuery !== null
    ? suggestions.filter(s => s.username.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredSuggestions.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev + 1) % filteredSuggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveSuggestionIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            e.preventDefault();
            handleMentionSelect(filteredSuggestions[activeSuggestionIndex].username);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setMentionQuery(null);
        }
    } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleShare();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type.startsWith('image/')) {
        if (selectedFile.size > 10 * 1024 * 1024) { toast({ variant: "destructive", description: "Resim boyutu 10MB'dan büyük olamaz." }); return; }
        setFile(selectedFile);
        setFileType('image');
        const reader = new FileReader();
        reader.onload = () => setImageToCrop(reader.result as string);
        reader.readAsDataURL(selectedFile);
    } else if (selectedFile.type.startsWith('video/')) {
        if (selectedFile.size > 50 * 1024 * 1024) { toast({ variant: "destructive", description: "Video boyutu 50MB'dan büyük olamaz." }); return; }
        setFile(selectedFile);
        setFileType('video');
        setVideoPreview(URL.createObjectURL(selectedFile));
    } else {
        toast({ variant: "destructive", description: "Lütfen bir resim veya video dosyası seçin." });
    }
  };
  
  const handleCropComplete = (croppedDataUrl: string) => {
    setCroppedImage(croppedDataUrl);
    setOriginalCroppedImage(croppedDataUrl);
    setWasEditedByAI(false);
    setImageToCrop(null);
  }

  const removeFile = () => {
      setFile(null);
      setFileType(null);
      setCroppedImage(null);
      setImageToCrop(null);
      if (videoPreview) URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
      setOriginalCroppedImage(null);
      setWasEditedByAI(false);
      setSelectedMusic(null);
      if(fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleAiEdit = async () => {
    if (!croppedImage || !aiPrompt.trim()) return;

    setIsAiEditing(false); // Close dialog
    setIsProcessing(true);
    try {
        const result = await applyImageFilter({ photoDataUri: croppedImage, style: aiPrompt });
        if (result.success && result.data?.styledPhotoDataUri) {
            setCroppedImage(result.data.styledPhotoDataUri);
            setWasEditedByAI(true);
            toast({ description: "Resim başarıyla AI ile düzenlendi." });
            setAiPrompt("");
        } else {
            throw new Error(result.error || "AI düzenlemesi başarısız oldu.");
        }
    } catch (error: any) {
        toast({ variant: "destructive", title: "AI Düzenleme Hatası", description: error.message });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleRevertAiEdit = () => {
      if (originalCroppedImage) {
          setCroppedImage(originalCroppedImage);
          setWasEditedByAI(false);
          toast({ description: "AI düzenlemesi geri alındı." });
      }
  };

  const handleShare = async () => {
    if (!user || !userData) return;
    if (!text.trim() && !file) { toast({ variant: 'destructive', description: 'Paylaşmak için bir metin yazın veya bir dosya seçin.' }); return; }

    setIsSubmitting(true);
    setUploadProgress(0);
    
    try {
        let imageUrl = "";
        let videoUrl = "";
        let finalBlob: Blob | null = null;
        
        if (file) {
            if (fileType === 'image' && croppedImage) {
                finalBlob = await dataUriToBlob(croppedImage);
            } else if (fileType === 'video') {
                 if (selectedMusic) {
                    setIsProcessing(true);
                    toast({ description: 'Müzik videoya ekleniyor...' });
                    const ffmpeg = ffmpegRef.current;
                    await ffmpeg.writeFile('input.mp4', await fetchFile(file));
                    await ffmpeg.writeFile('audio.mp3', await fetchFile(selectedMusic.url));
                    await ffmpeg.exec(['-i', 'input.mp4', '-i', 'audio.mp3', '-c:v', 'copy', '-c:a', 'aac', '-map', '0:v:0', '-map', '1:a:0', '-shortest', 'output.mp4']);
                    const data = await ffmpeg.readFile('output.mp4') as Uint8Array;
                    finalBlob = new Blob([data.buffer], { type: 'video/mp4' });
                    setIsProcessing(false);
                } else {
                    finalBlob = file;
                }
            }

            if (finalBlob) {
                const storagePath = `upload/posts/${fileType}s/${user.uid}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, storagePath);
                const uploadTask = uploadBytesResumable(fileRef, finalBlob);

                await new Promise<void>((resolve, reject) => {
                    uploadTask.on('state_changed',
                        (snapshot) => {
                            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                            setUploadProgress(progress);
                        }, 
                        (error) => reject(error),
                        async () => {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            if (fileType === 'image') imageUrl = downloadURL;
                            else if (fileType === 'video') videoUrl = downloadURL;
                            resolve();
                        }
                    );
                });
            }
        }
        
        await createPost({
            uid: user.uid,
            username: userData.username,
            userAvatar: userData.photoURL || null,
            userAvatarFrame: userData.selectedAvatarFrame || '',
            userRole: userData.role || 'user',
            userGender: userData.gender,
            text: text,
            imageUrl: imageUrl,
            videoUrl: videoUrl,
            editedWithAI: wasEditedByAI,
            language: i18n.language,
        });

        toast({ title: "Başarıyla Paylaşıldı!", description: "Gönderiniz akışta görünecektir." });
        router.push(videoUrl ? '/surf' : '/home');

    } catch (error: any) {
        console.error("Gönderi paylaşılırken hata:", error);
        toast({ 
            variant: 'destructive', 
            title: 'Bir Hata Oluştu', 
            description: error.message || 'Gönderiniz paylaşılamadı. Lütfen tekrar deneyin.', 
        });
    } finally {
        setIsSubmitting(false);
    }
  };

  const isLoading = isSubmitting || isProcessing;

  return (
    <>
    <Card className="w-full overflow-hidden rounded-3xl border-0 bg-card/80 shadow-xl shadow-black/5 backdrop-blur-sm">
        <div className="flex flex-col gap-4 p-5">
            <Popover open={mentionQuery !== null}>
                <PopoverAnchor asChild>
                    <div className="flex items-start gap-4">
                        <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-11 w-11 flex-shrink-0 border-2 border-white">
                            <AvatarImage src={user?.photoURL || undefined} />
                            <AvatarFallback>{user?.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        </div>
                        <Textarea
                            ref={textareaRef}
                            value={text}
                            onChange={handleTextChange}
                            onKeyDown={handleKeyDown}
                            placeholder="Aklında ne var? Birinden bahsetmek için @kullaniciadi kullan."
                            className="min-h-[60px] flex-1 resize-none border-0 bg-transparent p-0 text-base placeholder:text-muted-foreground/80 focus-visible:ring-0"
                            rows={2}
                            disabled={isLoading}
                        />
                    </div>
                </PopoverAnchor>
            </Popover>

          {isProcessing && (
            <div className="flex items-center gap-2 text-sm text-primary p-2 bg-primary/10 rounded-lg animate-in fade-in">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Video işleniyor, lütfen bekleyin...</span>
            </div>
          )}

          {fileType === 'image' && croppedImage && (
             <div className="ml-0 sm:ml-16 space-y-2">
                <div className="relative group">
                    <div className="overflow-hidden rounded-xl border">
                        <img src={croppedImage} alt="Önizleme" className="max-h-80 w-auto object-contain" />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAiEditing(true)} disabled={isLoading}><Sparkles className="mr-2 h-4 w-4" />AI ile Düzenle</Button>
                    {wasEditedByAI && (<Button variant="outline" size="sm" onClick={handleRevertAiEdit} disabled={isLoading}><RefreshCcw className="mr-2 h-4 w-4" />Geri Al</Button>)}
                    <Button variant="destructive" size="sm" onClick={removeFile} disabled={isLoading}><X className="mr-2 h-4 w-4" />Kaldır</Button>
                </div>
            </div>
          )}

          {fileType === 'video' && videoPreview && (
            <div className="ml-0 sm:ml-16 space-y-2">
                <div className="relative group">
                    <video src={videoPreview} controls className="w-full rounded-lg bg-black"></video>
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full" onClick={removeFile} disabled={isLoading}><X className="h-4 w-4" /></Button>
                </div>
            </div>
          )}

          {isSubmitting && uploadProgress > 0 && (
            <div className="ml-0 sm:ml-16 space-y-1">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-center text-muted-foreground">Yükleniyor... %{Math.round(uploadProgress)}</p>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between border-t border-border/50 bg-muted/20 px-4 py-2">
          <div className="flex items-center gap-1">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*,video/*" className="hidden" />
            <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || !!file}
            >
                <File className="h-5 w-5" />
                <span className="sr-only">Dosya Ekle</span>
            </Button>
             <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={() => setIsMusicDialogOpen(true)}
                disabled={isLoading || fileType !== 'video'}
            >
                <Music className="h-5 w-5" />
                <span className="sr-only">Müzik Ekle</span>
            </Button>
          </div>
          
          <Button 
            className="rounded-full font-semibold px-4"
            onClick={handleShare}
            disabled={isLoading || (!text.trim() && !file)}
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            <span className="ml-2 hidden sm:inline">{isSubmitting ? 'Paylaşılıyor...' : 'Paylaş'}</span>
          </Button>
        </div>
      </Card>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)}
        imageSrc={imageToCrop}
        aspectRatio={16 / 9}
        onCropComplete={handleCropComplete}
      />
      <AlertDialog open={isAiEditing} onOpenChange={setIsAiEditing}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Resmi AI ile Düzenle</AlertDialogTitle>
            <AlertDialogDescription>
                Resme uygulamak istediğiniz stili veya değişikliği yazın. Örneğin: "suluboya tabloya çevir", "8-bit pixel art yap", "arka planı orman yap".
            </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="örn: make it a watercolor painting"
            disabled={isAiLoading}
            />
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isAiLoading}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleAiEdit} disabled={!aiPrompt || isAiLoading}>
                {isAiLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Uygula
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <Dialog open={isMusicDialogOpen} onOpenChange={setIsMusicDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Müzik Seç</DialogTitle>
            <DialogDescription>Videonuz için bir arka plan müziği seçin.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-72 rounded-md border p-2">
            <div className="space-y-2">
                {royaltyFreeMusic.map(music => (
                    <button key={music.title} onClick={() => setSelectedMusic(music)} className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-secondary rounded-md"><Music className="h-5 w-5"/></div>
                            <span className="text-sm font-medium">{music.title}</span>
                        </div>
                        {selectedMusic?.url === music.url && <CheckCircle className="h-5 w-5 text-primary"/>}
                    </button>
                ))}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button onClick={() => setIsMusicDialogOpen(false)}>Tamam</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
