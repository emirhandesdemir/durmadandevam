
// src/app/(main)/call/[callId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, deleteDoc, getDoc, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendAnswer, sendIceCandidate, updateCallStatus, updateVideoStatus, sendOffer } from '@/lib/actions/callActions';
import type { Call } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Video as VideoIcon, VideoOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface UserInfo {
  username: string;
  photoURL: string | null;
}

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

function CallControls({ onHangUp, onToggleMute, isMuted, onToggleVideo, isVideoOff }: any) {
    return (
        <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 25 }}
            className="absolute bottom-10 left-0 right-0 z-20 flex justify-center"
        >
            <div className="flex w-full max-w-xs items-center justify-center gap-4 rounded-full bg-black/40 p-3 backdrop-blur-sm">
                <Button onClick={onToggleVideo} variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white hover:bg-white/30">
                    {isVideoOff ? <VideoOff size={28}/> : <VideoIcon size={28}/>}
                </Button>
                <Button onClick={onToggleMute} variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white hover:bg-white/30">
                    {isMuted ? <MicOff size={28}/> : <Mic size={28}/>}
                </Button>
                <Button onClick={onHangUp} variant="destructive" size="icon" className="h-16 w-16 rounded-full">
                    <PhoneOff size={32}/>
                </Button>
            </div>
        </motion.div>
    );
}

function LocalVideoView({ stream }: { stream: MediaStream | null }) {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <motion.div
            drag
            dragMomentum={false}
            className="absolute top-6 right-6 z-30 w-32 h-48 cursor-grab overflow-hidden rounded-2xl border-2 border-white/50 shadow-2xl"
            whileTap={{ cursor: 'grabbing' }}
        >
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
        </motion.div>
    );
}


export default function CallPage() {
  const { user, loading: authLoading } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const callId = params.callId as string;

  const [callData, setCallData] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const isInitializedRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  const partner = useMemo(() => {
    if (!callData || !user) return null;
    return user.uid === callData.callerId ? callData.receiverInfo : callData.callerInfo;
  }, [callData, user]);


  const getCallStatusText = () => {
      if (!callData) return 'Yükleniyor...';
      switch (callData.status) {
          case 'ringing': return 'Çalıyor...';
          case 'active': return 'Bağlandı';
          default: return 'Bekleniyor...';
      }
  }

  const cleanupAndLeave = useCallback(async (shouldUpdateDb = false) => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (shouldUpdateDb && callId) {
      await updateCallStatus(callId, 'ended');
    }

    if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    }

    if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
    }

    if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
    }
    
    isInitializedRef.current = false;
    router.replace('/dm');
  }, [callId, router]);


  useEffect(() => {
    if (!user || !callId || isInitializedRef.current) return;
    isInitializedRef.current = true;

    let callUnsubscribe: () => void = () => {};
    let candidatesUnsubscribe: () => void = () => {};
    
    const initCall = async () => {
        try {
            const initialCallSnap = await getDoc(doc(db, 'calls', callId));
            if (!initialCallSnap.exists()) {
                toast({ variant: "destructive", description: "Arama bulunamadı." });
                router.replace('/dm');
                return;
            }

            const callDocData = initialCallSnap.data() as Call;
            setCallData(callDocData);
            
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peerConnectionRef.current = pc;

            const videoEnabled = callDocData.videoStatus?.[user.uid] ?? false;
            const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
            
            if (peerConnectionRef.current.signalingState === 'closed') {
                stream.getTracks().forEach(track => track.stop());
                return;
            }

            localStreamRef.current = stream;
             if (pc.signalingState !== 'closed') {
                stream.getTracks().forEach(track => pc.addTrack(track, stream));
            }
            setIsVideoOff(!videoEnabled);

            pc.ontrack = (event) => {
                if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = event.streams[0];
                }
            };

            pc.onicecandidate = (event) => {
                if (event.candidate && callDocData) {
                    const targetId = user.uid === callDocData.callerId ? callDocData.receiverId : callDocData.callerId;
                    sendIceCandidate(callId, event.candidate.toJSON(), targetId);
                }
            };

            callUnsubscribe = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
                const currentPc = peerConnectionRef.current;
                if (!currentPc || currentPc.signalingState === 'closed') {
                    return;
                }

                const data = snapshot.data() as Call;
                
                if (!snapshot.exists() || ['ended', 'declined', 'missed'].includes(data.status)) {
                    if (isInitializedRef.current){
                       toast({ description: "Arama sonlandırıldı." });
                       await cleanupAndLeave();
                    }
                    return;
                }
                
                setCallData(data);
                const isCaller = data.callerId === user.uid;

                // Receiver handles the offer
                if (data.offer && !isCaller && currentPc.signalingState !== 'have-remote-offer') {
                    await currentPc.setRemoteDescription(new RTCSessionDescription(data.offer));
                    const answer = await currentPc.createAnswer();
                    await currentPc.setLocalDescription(answer);
                    await sendAnswer(callId, answer);
                }

                // Caller handles the answer
                if (data.answer && isCaller && currentPc.signalingState !== 'stable') {
                    await currentPc.setRemoteDescription(new RTCSessionDescription(data.answer));
                }
            });

            candidatesUnsubscribe = onSnapshot(collection(db, 'calls', callId, `${user.uid}Candidates`), async (snapshot) => {
                const currentPc = peerConnectionRef.current;
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added') {
                        if (currentPc && currentPc.signalingState !== 'closed' && currentPc.remoteDescription) {
                            try {
                                await currentPc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                            } catch(e) { console.error("Error adding received ice candidate", e); }
                        }
                        await deleteDoc(change.doc.ref);
                    }
                }
            });

            if (user.uid === callDocData.callerId) {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendOffer(callId, offer);
            }
        } catch (err) {
            console.error("Call setup error:", err);
            toast({ variant: "destructive", title: "İzin Hatası", description: "Arama için kamera/mikrofon izni gerekli." });
            await cleanupAndLeave(true);
        }
    };

    initCall();

    return () => {
      callUnsubscribe();
      candidatesUnsubscribe();
      cleanupAndLeave();
    };
  }, [user, callId, router, toast, cleanupAndLeave]);

  const toggleMute = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(p => !p);
    }
  };
  
  const toggleVideo = async () => {
      if (!user || !localStreamRef.current) return;
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
          const newVideoState = !videoTrack.enabled;
          videoTrack.enabled = newVideoState;
          setIsVideoOff(!newVideoState);
          await updateVideoStatus(callId, user.uid, newVideoState);
      }
  };
  
  const isLoading = authLoading || !callData || !partner;
  if (isLoading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <p className="mt-4 text-white">Bağlantı kuruluyor...</p>
      </div>
    );
  }

  const partnerId = callData.callerId === user?.uid ? callData.receiverId : callData.callerId;
  const showRemoteVideo = callData.videoStatus?.[partnerId] && callData.status === 'active';

  return (
    <div className="relative h-full w-full bg-gradient-to-br from-slate-800 via-black to-slate-900 text-white overflow-hidden">
        <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className={cn(
                "absolute inset-0 w-full h-full object-cover transition-opacity duration-500",
                showRemoteVideo ? "opacity-100" : "opacity-0"
            )} 
        />
        
        {!isVideoOff && <LocalVideoView stream={localStreamRef.current} />}

        <AnimatePresence>
        {!showRemoteVideo && (
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 p-4"
            >
                <div className="relative">
                    <Avatar className="h-40 w-40 border-4 border-white/20">
                        <AvatarImage src={partner.photoURL || undefined} />
                        <AvatarFallback className="text-6xl bg-gray-600">{partner.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
                    <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" style={{animationDelay: '0.5s'}}></div>
                </div>
                <div className="text-center mt-4">
                    <h2 className="text-4xl font-bold [text-shadow:_0_2px_4px_rgba(0,0,0,0.5)]">{partner.username}</h2>
                    <p className="text-lg text-white/80 mt-2">{getCallStatusText()}</p>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
        
        <CallControls 
            onHangUp={() => cleanupAndLeave(true)}
            onToggleMute={toggleMute}
            isMuted={isMuted}
            onToggleVideo={toggleVideo}
            isVideoOff={isVideoOff}
        />
    </div>
  );
}
