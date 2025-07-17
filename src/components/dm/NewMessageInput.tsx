
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, Mic, Trash2, Camera, Timer, X, StopCircle, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { motion, AnimatePresence } from 'framer-motion';

interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
  profileEmoji: string | null;
  selectedAvatarFrame?: string;
}

interface NewMessageInputProps {
  chatId: string;
  sender: UserInfo;
  receiver: UserInfo;
}

const messageSchema = z.object({
  text: z.string().optional(),
});
type MessageFormValues = z.infer<typeof messageSchema>;

const formatRecordingTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const AudioPreviewPlayer = ({ audioUrl, duration }: { audioUrl: string; duration: number }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
        const handleEnded = () => setIsPlaying(false);

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);
    
    const togglePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const changePlaybackRate = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        if (audioRef.current) {
            audioRef.current.playbackRate = nextRate;
        }
        setPlaybackRate(nextRate);
    };

    return (
        <div className="flex items-center gap-2 p-2 w-full">
            <audio ref={audioRef} src={audioUrl} preload="metadata" />
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={togglePlayPause}>
                {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <div className="flex-1 h-1 bg-muted rounded-full relative">
                <div className="bg-primary h-full rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }} />
            </div>
            <div className="flex items-center gap-2">
                 <span className="text-xs font-mono w-12 text-right">{formatRecordingTime(currentTime)}</span>
                <Button variant="outline" size="sm" className="w-12 text-xs" onClick={changePlaybackRate}>
                    {playbackRate}x
                </Button>
            </div>
        </div>
    );
};


export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
    const { toast } = useToast();
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<MessageFormValues>({
        resolver: zodResolver(messageSchema),
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [imageSendType, setImageSendType] = useState<'permanent' | 'timed'>('permanent');
    
    const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textValue = watch('text');
    const showMicButton = !textValue?.trim() && !file && recordingStatus === 'idle';

    useEffect(() => {
        if (!file) {
          setPreview(null);
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;
        if (!selectedFile.type.startsWith('image/')) {
            toast({ variant: 'destructive', description: "Sadece resim dosyaları gönderilebilir." });
            return;
        }
        if (selectedFile.size > 5 * 1024 * 1024) {
            toast({ variant: 'destructive', description: "Dosya boyutu 5MB'dan büyük olamaz." });
            return;
        }
        setFile(selectedFile);
    };

    const handleImageOptionClick = (type: 'permanent' | 'timed') => {
        setImageSendType(type);
        fileInputRef.current?.click();
    };
    
    const cancelAndReset = () => {
        reset();
        setFile(null);
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingStatus('idle');
        setRecordingDuration(0);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    }

    const startRecording = async () => {
        setRecordingStatus('recording');
        setRecordingDuration(0);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                
                if (chunks.length === 0) return;

                const newAudioBlob = new Blob(chunks, { type: 'audio/webm' });
                 if (newAudioBlob.size > 10 * 1024 * 1024) { // 10MB limit
                    toast({ variant: 'destructive', description: "Ses kaydı 10MB'dan büyük olamaz."});
                    cancelAndReset();
                    return;
                }
                setAudioBlob(newAudioBlob);
                setAudioUrl(URL.createObjectURL(newAudioBlob));
                setRecordingStatus('preview');
            };
            
            mediaRecorderRef.current.start();
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            toast({ variant: 'destructive', description: "Mikrofon erişimi reddedildi veya bulunamadı." });
            cancelAndReset();
        }
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
        }
    };
    
    const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
        setIsSubmitting(true);
        try {
            if (audioBlob && recordingStatus === 'preview') {
                await sendMessage(chatId, sender, receiver, { audio: { dataUrl: audioUrl!, blob: audioBlob, duration: recordingDuration } });
                cancelAndReset();
            } else if (file) {
              const reader = new FileReader();
              reader.readAsDataURL(file);
              reader.onloadend = async () => {
                const base64Image = reader.result as string;
                await sendMessage(chatId, sender, receiver, { text: data.text, imageUrl: base64Image, imageType: imageSendType });
                cancelAndReset();
              }
            } else if (data.text?.trim()) {
                await sendMessage(chatId, sender, receiver, { text: data.text });
                cancelAndReset();
            }
        } catch (error: any) {
             toast({ variant: 'destructive', description: `Mesaj gönderilemedi: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-background rounded-full">
            {preview && file && (
                 <div className='relative p-2 ml-2 mb-2 bg-background rounded-lg border w-fit'>
                    <img src={preview} alt="Önizleme" className="max-h-24 rounded-md" />
                     {imageSendType === 'timed' && (
                        <div className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full">
                            <Timer className="h-4 w-4" />
                        </div>
                    )}
                    <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => setFile(null)}>
                        <X className="h-4 w-4"/>
                    </Button>
                </div>
            )}
            
            <AnimatePresence>
            {recordingStatus !== 'idle' ? (
                <motion.div
                    key="recorder-ui"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="flex w-full items-center justify-between p-2 overflow-hidden"
                >
                    {recordingStatus === 'recording' ? (
                         <>
                            <div className="flex items-center gap-2 text-destructive flex-1">
                                <span className="relative flex h-3 w-3 ml-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                                </span>
                                <p className="font-mono text-sm">{formatRecordingTime(recordingDuration)}</p>
                            </div>
                            <Button type="button" variant="destructive" size="icon" className="rounded-full h-10 w-10" onClick={stopRecording}>
                                <StopCircle className="h-5 w-5" />
                            </Button>
                         </>
                    ) : (
                         <>
                            <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={cancelAndReset}>
                                <Trash2 className="h-5 w-5 text-destructive" />
                            </Button>
                            {audioUrl && <AudioPreviewPlayer audioUrl={audioUrl} duration={recordingDuration}/>}
                            <Button type='button' onClick={handleSubmit(onSubmit)} size="icon" disabled={isSubmitting} className="rounded-full flex-shrink-0 h-10 w-10">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            </Button>
                         </>
                    )}
                </motion.div>
            ) : (
                <motion.div
                     key="input-ui"
                     initial={{ opacity: 0, y: -10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                >
                    <form 
                      onSubmit={handleSubmit(onSubmit)} 
                      className="flex w-full items-center space-x-2 p-1"
                    >
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" disabled={isSubmitting}>
                                    <ImagePlus className='h-5 w-5 text-muted-foreground'/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="top" align="start">
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" className="justify-start" onClick={() => handleImageOptionClick('permanent')}>
                                        <Camera className="mr-2 h-4 w-4" /> Kalıcı Fotoğraf
                                    </Button>
                                    <Button variant="ghost" className="justify-start" onClick={() => handleImageOptionClick('timed')}>
                                        <Timer className="mr-2 h-4 w-4" /> Süreli Fotoğraf
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        
                        <Input
                            {...register('text')}
                            placeholder="Bir mesaj yaz..."
                            autoComplete="off"
                            className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            disabled={isSubmitting}
                        />

                        {showMicButton ? (
                             <Button type="button" size="icon" className="rounded-full flex-shrink-0 h-10 w-10" onClick={startRecording}>
                                <Mic className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button type='submit' size="icon" disabled={(!textValue?.trim() && !file) || isSubmitting} className="rounded-full flex-shrink-0 h-10 w-10">
                                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                <span className="sr-only">Gönder</span>
                            </Button>
                        )}
                    </form>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
    );
}
