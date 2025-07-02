// src/app/(main)/call/[callId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendAnswer, sendIceCandidate, updateCallStatus, updateVideoStatus, sendOffer } from '@/lib/actions/callActions';
import type { Call } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Video as VideoIcon, VideoOff, MoreHorizontal, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Define the UserInfo type locally as it's used for partner state
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
            className="absolute bottom-10 inset-x-0 z-20 flex justify-center"
        >
            <div className="flex items-center justify-center gap-4 rounded-full bg-black/40 p-3 backdrop-blur-sm">
                <Button onClick={onToggleVideo} variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white hover:bg-white/30">
                    {isVideoOff ? <VideoOff size={28}/> : <VideoIcon size={28}/>}
                </Button>
                <Button onClick={onToggleMute} variant="ghost" size="icon" className="h-14 w-14 rounded-full text-white hover:bg-white/30">
                    {isMuted ? <MicOff size={28}/> : <Mic size={28}/>}
                </Button>
                 <Button onClick={onHangUp} variant="destructive" size="icon" className="h-14 w-14 rounded-full">
                    <PhoneOff size={28}/>
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

  const [pageLoading, setPageLoading] = useState(true);
  const [callData, setCallData] = useState<Call | null>(null);
  const [partner, setPartner] = useState<UserInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  const [partnerVideoOn, setPartnerVideoOn] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const didSetupWebRTC = useRef(false);

  const getCallStatusText = () => {
      switch (callData?.status) {
          case 'ringing': return 'Çalıyor...';
          case 'active': return 'Bağlandı';
          default: return 'Bekleniyor...';
      }
  }

  const cleanupCall = useCallback(() => {
    console.log("Arama temizleniyor...");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        remoteVideoRef.current.srcObject = null;
    }
    router.push('/dm');
  }, [router]);


  const hangUp = useCallback(async () => {
    if (!callId) return;
    await updateCallStatus(callId, 'ended');
    cleanupCall();
  }, [callId, cleanupCall]);


  useEffect(() => {
    if (!user || !callId) return;

    const callRef = doc(db, 'calls', callId);
    const unsubscribeCall = onSnapshot(callRef, (snapshot) => {
      if (!snapshot.exists()) {
        toast({ variant: 'destructive', description: "Arama bulunamadı veya sonlandırıldı." });
        cleanupCall();
        return;
      }
      
      const data = { id: snapshot.id, ...snapshot.data() } as Call;
      const derivedPartner = user.uid === data.callerId ? data.receiverInfo : data.callerInfo;
      
      setCallData(data);
      setPartner(derivedPartner);
      
      const partnerId = data.callerId === user.uid ? data.receiverId : data.callerId;
      setPartnerVideoOn(data.videoStatus?.[partnerId] ?? false);

      setPageLoading(false);

      if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
        toast({ description: "Arama sonlandırıldı." });
        cleanupCall();
      }
    }, (error) => {
        console.error("Arama verisi alınamadı:", error);
        toast({ variant: 'destructive', description: "Arama bilgileri alınamadı. Bağlantı hatası olabilir." });
        cleanupCall();
    });

    return () => unsubscribeCall();
  }, [user, callId, toast, cleanupCall]);


  const setupWebRTC = useCallback(async (isCaller: boolean) => {
    if (!user || !callData) return;
    
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);
    const pc = peerConnectionRef.current;
    
    const initialVideoState = callData.videoStatus?.[user.uid] ?? false;
    setIsVideoOff(!initialVideoState);

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: initialVideoState, audio: true });
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
    } catch(err) {
        console.error("getUserMedia error:", err);
        toast({ variant: "destructive", title: "İzin Hatası", description: "Arama için kamera/mikrofon izni gerekli." });
        hangUp();
        return () => {};
    }
    
    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    const target = isCaller ? 'receiver' : 'caller';
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate(callId, event.candidate.toJSON(), target);
      }
    };

    const candidatesCollection = collection(db, 'calls', callId, isCaller ? 'callerCandidates' : 'receiverCandidates');
    const unsubscribeCandidates = onSnapshot(candidatesCollection, async (snapshot) => {
        for (const change of snapshot.docChanges()) {
            if (change.type === 'added') {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                    await deleteDoc(change.doc.ref);
                } catch(e) {
                    console.error("Error adding received ice candidate", e);
                }
            }
        }
    });
    
    return unsubscribeCandidates;

  }, [user, callId, callData, hangUp, toast]);


  useEffect(() => {
    // Only proceed if we have the necessary data and haven't set up yet.
    if (!user || !callData || didSetupWebRTC.current) {
        return;
    }

    // Mark as "setting up" to prevent this effect from running again.
    didSetupWebRTC.current = true;
    
    let unsubscribeCandidates: (() => void) | undefined;
    
    const initWebRTC = async () => {
        // The setupWebRTC function returns the unsubscribe function for the candidate listener.
        unsubscribeCandidates = await setupWebRTC(callData.callerId === user.uid);
    };

    initWebRTC().catch(e => {
        console.error("Failed to initialize WebRTC", e);
        // If init fails, reset the flag so it can be tried again if dependencies change.
        didSetupWebRTC.current = false;
    });

    // Cleanup function for this effect.
    return () => {
        if (unsubscribeCandidates) {
            unsubscribeCandidates();
        }
    };
}, [user, callData, setupWebRTC]);


  // Effect for caller: create offer
  useEffect(() => {
    if (!user || !callData || !peerConnectionRef.current || callData.status !== 'ringing' || callData.callerId !== user.uid) return;
    
    const createOffer = async () => {
        const pc = peerConnectionRef.current!;
        if (pc.signalingState !== 'stable') return;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendOffer(callId, offer);
    };

    createOffer().catch(err => console.error("Error creating offer:", err));

  }, [user, callData?.status, callId, callData?.callerId]);

  // Effect for receiver: create answer
  useEffect(() => {
    if (!user || !callData || !peerConnectionRef.current || callData.status !== 'ringing' || callData.receiverId !== user.uid || !callData.offer) return;
    
    const createAnswer = async () => {
        const pc = peerConnectionRef.current!;
        if (pc.signalingState === 'stable') {
          await pc.setRemoteDescription(new RTCSessionDescription(callData.offer!));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await sendAnswer(callId, answer);
        }
    };
    
    createAnswer().catch(err => console.error("Error creating answer:", err));

  }, [user, callData?.offer, callData?.status, callData?.receiverId, callId]);


  // Effect to apply received answer
  useEffect(() => {
    if (!user || !peerConnectionRef.current || !callData?.answer || callData.callerId !== user.uid) return;
    
    const pc = peerConnectionRef.current;
    if (pc.signalingState === 'have-local-offer') {
      pc.setRemoteDescription(new RTCSessionDescription(callData.answer)).catch(err => console.error("Error setting remote description:", err));
    }
  }, [user, callData?.answer, callData?.callerId]);


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

  if (authLoading || pageLoading || !callData || !partner) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900">
        <Loader2 className="h-10 w-10 animate-spin text-white" />
        <p className="mt-4 text-white">Arama bilgileri yükleniyor...</p>
      </div>
    );
  }

  const showRemoteVideo = partnerVideoOn && callData.type === 'video' && callData.status === 'active';

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
                    {callData.status === 'ringing' && (
                        <>
                            <div className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping"></div>
                            <div className="absolute inset-0 rounded-full border-2 border-white/50 animate-ping" style={{animationDelay: '0.5s'}}></div>
                        </>
                    )}
                </div>
                <div className="text-center mt-4">
                    <h2 className="text-4xl font-bold [text-shadow:_0_2px_4px_rgba(0,0,0,0.5)]">{partner.username}</h2>
                    <p className="text-lg text-white/80 mt-2">{getCallStatusText()}</p>
                </div>
            </motion.div>
        )}
        </AnimatePresence>
        
        <CallControls 
            onHangUp={hangUp}
            onToggleMute={toggleMute}
            isMuted={isMuted}
            onToggleVideo={toggleVideo}
            isVideoOff={isVideoOff}
        />
    </div>
  );
}
