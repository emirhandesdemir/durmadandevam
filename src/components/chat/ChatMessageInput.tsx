
// src/components/chat/ChatMessageInput.tsx
"use client";

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2, ImagePlus, X, FileVideo } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Room } from '@/lib/types';

interface ChatMessageInputProps {
  room: Room;
}

export default function ChatMessageInput({ room }: ChatMessageInputProps) {
  const { user: currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isParticipant = room.participants.some(p => p.uid === currentUser?.uid);

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

    if (selectedFile.size > 25 * 1024 * 1024) { // 25MB limit
        toast({ variant: 'destructive', description: "Dosya boyutu 25MB'dan büyük olamaz." });
        return;
    }
    setFile(selectedFile);
  };
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!message.trim() && !file) || !currentUser || !isParticipant || isSending) return;

    setIsSending(true);
    let imageUrls: string[] = [];
    let videoUrl: string | undefined;
    
    try {
        if (file) {
            const isImage = file.type.startsWith('image/');
            const folder = isImage ? 'images' : 'videos';
            const path = `upload/rooms/${room.id}/${folder}/${uuidv4()}_${file.name}`;
            const storageRef = ref(storage, path);
            await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(storageRef);
            if (isImage) imageUrls.push(downloadUrl);
            else videoUrl = downloadUrl;
        }

        const messagePath = collection(db, "rooms", room.id, "messages");
        
        const messageData: { [key: string]: any } = {
            uid: currentUser.uid,
            username: currentUser.displayName || 'Anonim',
            photoURL: currentUser.photoURL,
            text: message || '',
            createdAt: serverTimestamp(),
            type: 'user',
            selectedBubble: userData?.selectedBubble || '',
            selectedAvatarFrame: userData?.selectedAvatarFrame || '',
        };

        if (imageUrls.length > 0) {
            messageData.imageUrls = imageUrls;
        }
        if (videoUrl) {
            messageData.videoUrl = videoUrl;
        }
        
        await addDoc(messagePath, messageData);
        
        setMessage('');
        setFile(null);

    } catch (error: any) {
        console.error("Mesaj gönderilirken hata: ", error);
        toast({
            title: "Hata",
            description: error.message || "Mesaj gönderilirken bir hata oluştu.",
            variant: "destructive"
        });
    } finally {
        setIsSending(false);
    }
  };

  if (!isParticipant) {
    return <p className="w-full text-center text-sm text-muted-foreground px-4">Mesaj göndermek için odaya katılmalısınız.</p>;
  }
  
  return (
    <div className='w-full'>
        {preview && file && (
            <div className='relative p-2 mb-2 bg-background rounded-lg border w-fit'>
                {file.type.startsWith('image/') ? (
                    <img src={preview} alt="Önizleme" className="max-h-24 rounded-md" />
                ) : (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                        <FileVideo className="h-6 w-6"/>
                        <span className="text-sm text-muted-foreground truncate max-w-xs">{file.name}</span>
                    </div>
                )}
                <Button variant="ghost" size="icon" className="absolute -top-3 -right-3 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/80" onClick={() => setFile(null)}>
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        )}
        <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2 bg-muted rounded-full p-1.5">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,video/*" />
            <Button type="button" variant="ghost" size="icon" className="rounded-full flex-shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                <ImagePlus className='h-5 w-5 text-muted-foreground' />
            </Button>
            <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Bir mesaj yaz..."
                autoComplete="off"
                className="flex-1 bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground"
                disabled={isSending}
            />
            <Button type="submit" size="icon" disabled={(!message.trim() && !file) || isSending} className="rounded-full flex-shrink-0 h-9 w-9 bg-primary shadow-lg transition-transform hover:scale-110">
                {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                <span className="sr-only">Gönder</span>
            </Button>
        </form>
    </div>
  );
}
