// src/app/(main)/live/[liveId]/page.tsx
'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { LiveSession, Message, UserProfile } from '@/lib/types';
import { Loader2, XCircle } from 'lucide-react';
import LiveChat from '@/components/live/LiveChat';
import { joinLiveStream, leaveLiveStream, endLiveStream } from '@/lib/actions/liveActions';
import LiveStreamerControls from '@/components/live/LiveStreamerControls';
import LiveParticipantList from '@/components/live/LiveParticipantList';
import LiveStatsSummary from '@/components/live/LiveStatsSummary';
import { Button } from '@/components/ui/button';

export default function LiveStreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user, userData } = useAuth();
  const liveId = params.liveId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<{ uid: string, username: string, photoURL: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [finalStats, setFinalStats] = useState<Partial<LiveSession> | null>(null);
  
  // Host specific states
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [isParticipantListOpen, setIsParticipantListOpen] = useState(false);

  const isHost = user?.uid === session?.hostId;

  // Cleanup function
  const cleanup = useCallback(() => {
    stream?.getTracks().forEach(track => track.stop());
    setStream(null);
  }, [stream]);
  
  // Initial setup: get stream, join session, setup listeners
  useEffect(() => {
    if (!liveId || !user) return;
    
    let streamPromise: Promise<MediaStream> | null = null;
    
    if (user.uid === session?.hostId || !session) {
      streamPromise = navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    }

    const setup = async () => {
        try {
            if (streamPromise) {
                const mediaStream = await streamPromise;
                setStream(mediaStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            }
            await joinLiveStream(liveId, user.uid);
        } catch(err) {
            console.error("Yayın kurulum hatası:", err);
            setError("Kamera/mikrofon erişimi reddedildi veya yayın akışı alınamadı.");
        }
    };
    setup();

    const sessionUnsub = onSnapshot(doc(db, 'lives', liveId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as LiveSession;
        setSession(data);
        if (data.status === 'ended' && !isHost) {
          setError('Bu canlı yayın sona erdi.');
          cleanup();
        }
      } else {
        setError('Canlı yayın bulunamadı.');
        cleanup();
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
    
    // Fetch participants' info for the list
    const fetchParticipants = async () => {
        if (!session?.viewers) return;
        const uids = session.viewers.slice(0, 30); // Firestore 'in' query limit
        if (uids.length === 0) {
            setParticipants([]);
            return;
        }
        const usersQuery = query(collection(db, 'users'), where('uid', 'in', uids));
        const userDocs = await getDocs(usersQuery);
        setParticipants(userDocs.docs.map(d => {
            const u = d.data() as UserProfile;
            return { uid: u.uid, username: u.username, photoURL: u.photoURL };
        }));
    }
    if (session?.viewers) fetchParticipants();


    return () => {
        sessionUnsub();
        messagesUnsub();
        if (user) {
            leaveLiveStream(liveId, user.uid);
        }
        cleanup();
    };

  }, [liveId, user, isHost]); // Re-run if isHost status changes

  // Control handlers
  const handleToggleMute = useCallback(() => {
    if (stream) {
      stream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(p => !p);
    }
  }, [stream]);

  const handleToggleCamera = useCallback(() => {
    if (stream) {
        stream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
        setIsCameraOn(p => !p);
    }
  }, [stream]);

  const handleSwitchCamera = useCallback(async () => {
    // This is a complex feature that requires stopping the current track
    // and getting a new one with facingMode: 'environment'.
    // For this prototype, we'll just log a message.
    console.log("Switching camera...");
  }, []);

  const handleEndStream = useCallback(async () => {
      if (!isHost || !user) return;
      setIsEnding(true);
      try {
        const result = await endLiveStream(liveId, user.uid);
        if (result.success) {
            setFinalStats(result.finalStats as Partial<LiveSession>);
        }
      } catch (err: any) {
        setError(err.message || 'Yayın sonlandırılamadı.');
      } finally {
        setIsEnding(false);
        cleanup();
      }
  }, [isHost, user, liveId, cleanup]);

  // Render states
  if (finalStats) {
      return <LiveStatsSummary stats={finalStats} />;
  }

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
    <>
      <div className="h-full w-full bg-black relative flex flex-col">
        <video ref={videoRef} autoPlay muted={!isHost} playsInline className="absolute inset-0 w-full h-full object-cover -z-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent pointer-events-none" />
        
        <LiveChat 
              session={session}
              messages={messages}
              user={user}
              userData={userData}
        />
        {isHost && (
            <LiveStreamerControls 
                isMuted={isMuted}
                isCameraOn={isCameraOn}
                isEnding={isEnding}
                onToggleMute={handleToggleMute}
                onToggleCamera={handleToggleCamera}
                onSwitchCamera={handleSwitchCamera}
                onEndStream={handleEndStream}
                onShowParticipants={() => setIsParticipantListOpen(true)}
            />
        )}
      </div>
      <LiveParticipantList
          isOpen={isParticipantListOpen}
          onOpenChange={setIsParticipantListOpen}
          participants={participants}
          isHost={isHost}
          onKickUser={(userId) => console.log("Kicking user:", userId)} // Placeholder
      />
    </>
  );
}