// src/app/(main)/call/[callId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, deleteDoc, getDoc } from 'firebase/firestore';
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
  const [partner, setPartner] = useState<UserInfo | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(true);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const signalingStateRef = useRef<string | null>(null); // To track signaling state changes

  const getCallStatusText = () => {
      if (!callData) return 'Yükleniyor...';
      switch (callData.status) {
          case 'ringing': return 'Çalıyor...';
          case 'active': return 'Bağlandı';
          default: return 'Bekleniyor...';
      }
  }

  const cleanupAndLeave = useCallback(async (shouldUpdateStatus = false) => {
    if (shouldUpdateStatus && callId) {
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
    if (remoteVideoRef.current && remoteVideoRef.current.srcObject) {
        (remoteVideoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        remoteVideoRef.current.srcObject = null;
    }
    router.replace('/dm');
  }, [callId, router]);


  // Effect for setting up WebRTC and handling signals
  useEffect(() => {
    if (!user || !callId) return;

    let unsubCall: (() => void) | null = null;
    let unsubCandidates: (() => void) | null = null;

    const setup = async () => {
        // Step 1: Get user media
        try {
            const videoEnabled = callData ? callData.videoStatus?.[user.uid] ?? false : false;
            const stream = await navigator.mediaDevices.getUserMedia({ video: videoEnabled, audio: true });
            localStreamRef.current = stream;
            setIsVideoOff(!videoEnabled);
        } catch(err) {
            console.error("getUserMedia error:", err);
            toast({ variant: "destructive", title: "İzin Hatası", description: "Arama için kamera/mikrofon izni gerekli." });
            cleanupAndLeave(true);
            return;
        }

        // Step 2: Create Peer Connection
        peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);
        const pc = peerConnectionRef.current;

        // Step 3: Add local tracks to PC
        localStreamRef.current.getTracks().forEach(track => {
            pc.addTrack(track, localStreamRef.current!);
        });
        
        // Step 4: Setup event listeners for PC
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && callData) {
                const targetId = user.uid === callData.callerId ? callData.receiverId : callData.callerId;
                sendIceCandidate(callId, event.candidate.toJSON(), targetId);
            }
        };

        pc.onsignalingstatechange = () => {
             signalingStateRef.current = pc.signalingState;
        };

        // Step 5: Listen for signals
        unsubCall = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
            const data = snapshot.data() as Call;
            if (!snapshot.exists() || ['ended', 'declined', 'missed'].includes(data.status)) {
                toast({ description: "Arama sonlandırıldı." });
                cleanupAndLeave();
                return;
            }
            
            setCallData(data);
            const isCaller = data.callerId === user.uid;

            // Offer-Answer flow
            if (isCaller && data.status === 'ringing' && pc.signalingState === 'stable') {
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                await sendOffer(callId, offer);
            }

            if (!isCaller && data.offer && pc.signalingState !== 'have-remote-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendAnswer(callId, answer);
            }

            if (isCaller && data.answer && pc.signalingState === 'have-local-offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
            }
        });

        // Step 6: Listen for ICE candidates
        const otherPeerId = callData ? (user.uid === callData.callerId ? callData.receiverId : callData.callerId) : null;
        if(otherPeerId) {
            unsubCandidates = onSnapshot(collection(db, 'calls', callId, `${user.uid}Candidates`), async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added') {
                        try {
                           if (pc.remoteDescription) {
                             await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                             await deleteDoc(change.doc.ref);
                           }
                        } catch(e) { console.error("Error adding received ice candidate", e); }
                    }
                }
            });
        }
    };
    
    // Initial data fetch before setting up WebRTC
    const callDocRef = doc(db, 'calls', callId);
    getDoc(callDocRef).then(initialSnap => {
        if(initialSnap.exists()) {
            const data = initialSnap.data() as Call;
            setCallData(data);
            setPartner(user?.uid === data.callerId ? data.receiverInfo : data.callerInfo);
            setup();
        } else {
            toast({ variant: "destructive", description: "Arama bulunamadı." });
            router.replace('/dm');
        }
    });

    return () => {
        if (unsubCall) unsubCall();
        if (unsubCandidates) unsubCandidates();
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
  
  const isLoading = authLoading || !callData || !partner || !peerConnectionRef.current;
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
