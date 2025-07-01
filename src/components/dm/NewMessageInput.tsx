// src/components/dm/NewMessageInput.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { sendMessage } from '@/lib/actions/dmActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Camera, Timer, X } from 'lucide-react';

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

// Kayıt sırasında gösterilecek yeni arayüz bileşeni
const RecordingUI = ({ duration }: { duration: number }) => {
    return (
        <div className="flex w-full items-center justify-between p-2 rounded-full bg-destructive/10 animate-in fade-in">
            <div className="flex items-center gap-2 text-destructive">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
                <p className="font-mono text-sm">{formatRecordingTime(duration)}</p>
            </div>
            <p className="text-xs text-muted-foreground">Göndermek için bırakın</p>
        </div>
    );
}

export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
    const { toast } = useToast();
    const { register, handleSubmit, reset, watch, formState: { isSubmitting: isTextSubmitting } } = useForm<MessageFormValues>({
        resolver: zodResolver(messageSchema),
    });

    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [imageSendType, setImageSendType] = useState<'permanent' | 'timed'>('permanent');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Yeni sesli mesaj durumu
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const recordingStartTime = useRef<number>(0);
  
    const textValue = watch('text');
    const showMic = !textValue?.trim() && !file;

    useEffect(() => {
        if (!file) {
          setPreview(null);
          return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
  
    // Kaydı başlatma fonksiyonu
    const startRecording = async () => {
        if (isRecording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            const chunks: Blob[] = [];
            
            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.push(e.data);
            };
            
            mediaRecorderRef.current.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                const duration = (Date.now() - recordingStartTime.current) / 1000;
                if (duration < 1) {
                    toast({ variant: 'destructive', description: "Sesli mesaj göndermek için basılı tutun." });
                    return;
                }
                const audioBlob = new Blob(chunks, { type: 'audio/webm' });
                sendAudioMessage(audioBlob, duration);
            };
            
            mediaRecorderRef.current.start();
            setIsRecording(true);
            recordingStartTime.current = Date.now();
            setRecordingDuration(0);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            
        } catch (err) {
            toast({ variant: 'destructive', description: "Mikrofon erişimi reddedildi veya bulunamadı." });
        }
    };
    
    // Kaydı durdurma ve gönderme fonksiyonu
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
        }
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        setIsRecording(false);
    };

    // Sesli mesajı eyleme gönderme
    const sendAudioMessage = async (blob: Blob, duration: number) => {
         const reader = new FileReader();
         reader.readAsDataURL(blob);
         reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            await sendMessage(chatId, sender, receiver, { audio: { dataUrl: base64Audio, duration } });
         };
    };

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
  
    const isLoading = isTextSubmitting || isUploading;

    if (isRecording) {
        return <RecordingUI duration={recordingDuration} />;
    }

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
            <form 
              onSubmit={handleSubmit(onSubmit)} 
              className="flex w-full items-center space-x-2 p-1"
            >
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
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

                <Input
                    {...register('text')}
                    placeholder="Bir mesaj yaz..."
                    autoComplete="off"
                    className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    disabled={isLoading}
                />
                <Button 
                    type={showMic ? 'button' : 'submit'}
                    onMouseDown={showMic ? startRecording : undefined}
                    onMouseUp={showMic ? stopRecording : undefined}
                    onTouchStart={showMic ? startRecording : undefined}
                    onTouchEnd={showMic ? stopRecording : undefined}
                    size="icon" 
                    disabled={!showMic && (!textValue?.trim() && !file) || isLoading} 
                    className="rounded-full flex-shrink-0 h-10 w-10"
                >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : showMic ? <Mic className="h-5 w-5" /> : <Send className="h-4 w-4" />}
                    <span className="sr-only">{showMic ? 'Sesli Mesaj Gönder' : 'Gönder'}</span>
                </Button>
            </form>
        </div>
    );
}
