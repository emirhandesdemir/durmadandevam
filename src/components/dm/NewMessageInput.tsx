// src/components/dm/NewMessageInput.tsx
'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, Mic, Trash2, Camera, Timer, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { motion, AnimatePresence } from 'framer-motion';


interface UserInfo {
  uid: string;
  username: string;
  photoURL: string | null;
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

export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
    const { toast } = useToast();
    const { register, handleSubmit, reset, watch, formState: { isSubmitting: isTextSubmitting } } = useForm<MessageFormValues>({
        resolver: zodResolver(messageSchema),
    });

    // File/Image state
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [imageSendType, setImageSendType] = useState<'permanent' | 'timed'>('permanent');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Audio state
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isRecordingRef = useRef(false); // Ref to get immediate state

    const textValue = watch('text');
    const showMicButton = !textValue?.trim() && !file;
    const isLoading = isTextSubmitting || isUploading || isRecording;

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
    }

    const startRecording = async () => {
        isRecordingRef.current = true;
        setRecordingDuration(0);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            
            // If user let go of the button while permission was being asked
            if (!isRecordingRef.current) {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            setIsRecording(true);
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                if (recordingIntervalRef.current) {
                    clearInterval(recordingIntervalRef.current);
                }
                
                if (recordingDuration < 1) {
                    toast({ variant: "destructive", description: "Sesli mesaj göndermek için daha uzun basılı tutun." });
                    return;
                }

                setIsUploading(true);
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    const base64Audio = reader.result as string;
                    await sendMessage(chatId, sender, receiver, { audio: { dataUrl: base64Audio, duration: recordingDuration } });
                    setIsUploading(false);
                };
                reader.onerror = () => {
                    toast({ variant: 'destructive', description: "Ses dosyası işlenemedi." });
                    setIsUploading(false);
                }
            };
            
            mediaRecorderRef.current.start();
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            toast({ variant: 'destructive', description: "Mikrofon erişimi reddedildi veya bulunamadı." });
            stopRecording(false);
        }
    };
    
    const stopRecording = (send: boolean) => {
        isRecordingRef.current = false;
        setIsRecording(false);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            if (send) {
                mediaRecorderRef.current.stop();
            } else {
                // To cancel without sending, we need to stop without triggering the onstop data send logic
                 if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
                 mediaRecorderRef.current.ondataavailable = null;
                 mediaRecorderRef.current.onstop = null;
                 mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
                 mediaRecorderRef.current = null;
                 toast({ description: "Sesli mesaj iptal edildi.", duration: 2000 });
            }
        }
    }

    const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
        if (file) {
          setIsUploading(true);
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onloadend = async () => {
            const base64Image = reader.result as string;
            await sendMessage(chatId, sender, receiver, { text: data.text, imageUrl: base64Image, imageType: imageSendType });
            reset();
            setFile(null);
            setIsUploading(false);
          }
          return;
        }
        
        if (data.text?.trim()) {
            await sendMessage(chatId, sender, receiver, { text: data.text });
            reset();
        }
    };

    return (
        <div className="bg-background rounded-full">
            {preview && file && !isRecording && (
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
            {isRecording && (
                <motion.div
                    key="recorder"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex w-full items-center justify-between p-2 overflow-hidden"
                >
                    <div className="flex items-center gap-2 text-destructive flex-1">
                        <span className="relative flex h-3 w-3 ml-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                        </span>
                        <p className="font-mono text-sm">{formatRecordingTime(recordingDuration)}</p>
                    </div>
                    <div className="text-sm text-muted-foreground animate-pulse">Göndermek için bırakın</div>
                    <Button type="button" variant="ghost" size="icon" className="rounded-full h-10 w-10 text-destructive" onClick={() => stopRecording(false)}>
                        <Trash2 className="h-5 w-5" />
                    </Button>
                </motion.div>
            )}
            </AnimatePresence>
            
            <AnimatePresence>
            {!isRecording && (
                <motion.div
                     key="input"
                     initial={{ opacity: 0, height: 0 }}
                     animate={{ opacity: 1, height: 'auto' }}
                     exit={{ opacity: 0, height: 0 }}
                     className="overflow-hidden"
                >
                    <form 
                      onSubmit={handleSubmit(onSubmit)} 
                      className="flex w-full items-center space-x-2 p-1"
                    >
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" disabled={isLoading}>
                                    <ImagePlus className='h-5 w-5 text-muted-foreground'/>
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-2" side="top" align="start">
                                <div className="flex flex-col gap-1">
                                    <Button variant="ghost" className="justify-start" onClick={() => handleImageOptionClick('permanent')}>
                                        <Camera className="mr-2 h-4 w-4" />
                                        Kalıcı Fotoğraf
                                    </Button>
                                     <Button variant="ghost" className="justify-start" onClick={() => handleImageOptionClick('timed')}>
                                        <Timer className="mr-2 h-4 w-4" />
                                        Süreli Fotoğraf
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
                            disabled={isLoading}
                        />

                        {showMicButton ? (
                             <Button 
                                type="button" 
                                size="icon" 
                                className="rounded-full flex-shrink-0 h-10 w-10" 
                                onMouseDown={startRecording}
                                onMouseUp={() => stopRecording(true)}
                                onMouseLeave={() => stopRecording(false)}
                                onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                                onTouchEnd={() => stopRecording(true)}
                             >
                                <Mic className="h-5 w-5" />
                            </Button>
                        ) : (
                            <Button 
                                type='submit'
                                size="icon" 
                                disabled={(!textValue?.trim() && !file) || isLoading} 
                                className="rounded-full flex-shrink-0 h-10 w-10"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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
