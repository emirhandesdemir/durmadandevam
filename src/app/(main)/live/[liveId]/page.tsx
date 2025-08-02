// src/app/(main)/live/[liveId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LiveSession, Message } from '@/lib/types';
import { Loader2, XCircle } from 'lucide-react';
import LiveChat from '@/components/live/LiveChat';
import { joinLiveStream, leaveLiveStream } from '@/lib/actions/liveActions';

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  const liveId = params.liveId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  // In a real app, you would use a WebRTC or other streaming library to get the stream.
  // For this prototype, we will just use the user's own camera as a placeholder for the host's stream.
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    if (!liveId || !user) return;

    // Join the stream on mount
    joinLiveStream(liveId, user.uid);
    
    const sessionUnsub = onSnapshot(doc(db, 'lives', liveId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LiveSession;
        setSession(data);
        if (data.status === 'ended') {
          setError('Bu canlı yayın sona erdi.');
        }
      } else {
        setError('Canlı yayın bulunamadı.');
      }
      setLoading(false);
    }, (err) => {
        console.error("Yayın oturumu hatası:", err);
        setError("Yayın bilgileri yüklenemedi.");
        setLoading(false);
    });

    const messagesUnsub = onSnapshot(query(collection(db, 'lives', liveId, 'liveChatMessages'), orderBy('createdAt', 'desc'), limit(50)), (snapshot) => {
        setMessages(snapshot.docs.map(doc => doc.data() as Message).reverse());
    });
    
    // Placeholder stream logic: get user's camera
    const getStream = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Kamera erişimi hatası:", err);
            setError("Yayın akışı alınamadı.");
        }
    };
    getStream();


    return () => {
        sessionUnsub();
        messagesUnsub();
        stream?.getTracks().forEach(track => track.stop());
        if (user) {
            leaveLiveStream(liveId, user.uid);
        }
    };

  }, [liveId, user, router]);

  if (loading) {
    return <div className="flex h-full flex-col items-center justify-center bg-black text-white"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }
  
  if (error) {
     return (
        <div className="flex h-full flex-col items-center justify-center bg-black text-white p-4 text-center">
            <XCircle className="h-12 w-12 text-destructive mb-4" />
            <h2 className="text-xl font-bold">Bir Hata Oluştu</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/live')} className="mt-6">Canlı Yayınlara Geri Dön</Button>
        </div>
    );
  }

  if (!session) return null;

  return (
    <div className="h-full w-full bg-black relative flex flex-col">
       <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 w-full h-full object-cover -z-10" />
       <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
       
       <LiveChat 
            session={session}
            messages={messages}
            user={user}
            userData={userData}
       />
    </div>
  );
}
