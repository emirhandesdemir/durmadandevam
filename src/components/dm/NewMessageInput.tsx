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
import { Send, Loader2, ImagePlus, X, Mic, StopCircle, Play, Pause, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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

const formatRecordingTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export default function NewMessageInput({ chatId, sender, receiver }: NewMessageInputProps) {
  const { toast } = useToast();
  const { register, handleSubmit, reset, watch, formState: { isSubmitting: isTextSubmitting } } = useForm<MessageFormValues>({
    resolver: zodResolver(messageSchema),
  });

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice message state
  const [recordingStatus, setRecordingStatus] = useState<'idle' | 'recording' | 'preview'>('idle');
  const [recordedAudio, setRecordedAudio] = useState<{ url: string; blob: Blob; duration: number } | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement>(null);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  
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
  
  const handleStartRecording = async () => {
    if (recordingStatus !== 'idle') return;
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        chunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (e) => {
            if (e.data.size > 0) chunksRef.current.push(e.data);
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const url = URL.createObjectURL(blob);
            setRecordedAudio({ url, blob, duration: recordingDuration });
            setRecordingStatus('preview');
            stream.getTracks().forEach(track => track.stop()); // Stop microphone access
        };
        mediaRecorderRef.current.start();
        setRecordingStatus('recording');
        setRecordingDuration(0);
        recordingIntervalRef.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
        }, 1000);
    } catch (err) {
        toast({ variant: 'destructive', description: "Mikrofon erişimi reddedildi veya bulunamadı." });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recordingStatus === 'recording') {
        mediaRecorderRef.current.stop();
        if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
        }
    }
  };

  const handleDiscardRecording = () => {
    setRecordedAudio(null);
    setRecordingStatus('idle');
    setRecordingDuration(0);
    if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
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
  
  const onSubmit: SubmitHandler<MessageFormValues> = async (data) => {
    let content: { text?: string; imageUrl?: string; audio?: { dataUrl: string, duration: number } } = {};
    
    if (recordedAudio) {
      const reader = new FileReader();
      reader.readAsDataURL(recordedAudio.blob);
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;
        await sendMessage(chatId, sender, receiver, { audio: { dataUrl: base64Audio, duration: recordedAudio.duration } });
        handleDiscardRecording();
      };
      return;
    }
    
    if (file && !recordedAudio) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Image = reader.result as string;
        await sendMessage(chatId, sender, receiver, { text: data.text, imageUrl: base64Image });
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
  
  const togglePreviewPlay = () => {
      if(!audioPreviewRef.current) return;
      if(isPreviewPlaying) {
          audioPreviewRef.current.pause();
      } else {
          audioPreviewRef.current.play();
      }
      setIsPreviewPlaying(!isPreviewPlaying);
  };

  const isLoading = isTextSubmitting || isUploading;

  if (recordingStatus === 'recording') {
    return (
        <div className="flex w-full items-center justify-between p-2 rounded-full">
            <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                </span>
                <p className="font-mono text-sm">{formatRecordingTime(recordingDuration)}</p>
            </div>
            <Button size="icon" variant="destructive" className="rounded-full" onClick={handleStopRecording}>
                <StopCircle />
            </Button>
        </div>
    );
  }

  if (recordingStatus === 'preview' && recordedAudio) {
      return (
          <div className="flex w-full items-center justify-between gap-2 p-2 rounded-full">
              <audio ref={audioPreviewRef} src={recordedAudio.url} onEnded={() => setIsPreviewPlaying(false)} />
              <Button size="icon" variant="ghost" className="rounded-full" onClick={handleDiscardRecording}>
                  <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={togglePreviewPlay}>
                  {isPreviewPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </Button>
              <div className="w-full h-1 bg-muted rounded-full">
                <div className="h-1 bg-primary rounded-full" style={{ width: '0%' }} />
              </div>
              <span className="text-sm font-mono">{formatRecordingTime(recordedAudio.duration)}</span>
              <Button size="icon" className="rounded-full" onClick={() => handleSubmit(onSubmit)()}>
                  <Send className="h-4 w-4" />
              </Button>
          </div>
      )
  }

  return (
    <div className="bg-background rounded-full">
        {preview && file && (
            <div className='relative p-2 ml-2 mb-2 bg-background rounded-lg border w-fit'>
                <img src={preview} alt="Önizleme" className="max-h-24 rounded-md" />
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
            <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading}>
                <ImagePlus className='h-5 w-5 text-muted-foreground'/>
            </Button>
            <Input
                {...register('text')}
                placeholder="Bir mesaj yaz..."
                autoComplete="off"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                disabled={isLoading}
            />
            <Button 
                type={showMic ? 'button' : 'submit'}
                onClick={showMic ? handleStartRecording : undefined}
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
