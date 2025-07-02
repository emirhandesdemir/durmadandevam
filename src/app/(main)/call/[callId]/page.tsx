// src/app/(main)/call/[callId]/page.tsx
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, onSnapshot, collection, deleteDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { sendAnswer, sendIceCandidate, updateCallStatus } from '@/lib/actions/callActions';
import type { Call } from '@/lib/types';
import { AnimatePresence, motion } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, PhoneOff, Video as VideoIcon, VideoOff, SwitchCamera } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { sendOffer } from '@/lib/actions/callActions';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

function CallControls({ onHangUp, onToggleMute, isMuted, onToggleVideo, isVideoOff, onSwitchCamera }: any) {
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4 rounded-full bg-black/40 p-3 backdrop-blur-sm"
    >
      <Button onClick={onToggleMute} variant="secondary" size="icon" className="h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30">
        {isMuted ? <MicOff /> : <Mic />}
      </Button>
      <Button onClick={onToggleVideo} variant="secondary" size="icon" className="h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30">
        {isVideoOff ? <VideoOff /> : <VideoIcon />}
      </Button>
      <Button onClick={onSwitchCamera} variant="secondary" size="icon" className="h-14 w-14 rounded-full bg-white/20 text-white hover:bg-white/30">
        <SwitchCamera />
      </Button>
      <Button onClick={onHangUp} variant="destructive" size="icon" className="h-14 w-14 rounded-full">
        <PhoneOff />
      </Button>
    </motion.div>
  );
}


export default function CallPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const callId = params.callId as string;

  const [callData, setCallData] = useState<Call | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const cleanupCall = useCallback(() => {
    console.log("Cleaning up call...");
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    remoteStreamRef.current = null;
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
        toast({ variant: 'destructive', description: "Arama bulunamadı." });
        cleanupCall();
        return;
      }
      
      const data = { id: snapshot.id, ...snapshot.data() } as Call;
      setCallData(data);
      
      if (data.status === 'ended' || data.status === 'declined' || data.status === 'missed') {
        toast({ description: "Arama sonlandırıldı." });
        cleanupCall();
      }
    });

    return () => unsubscribeCall();
  }, [user, callId, toast, cleanupCall]);


  const setupWebRTC = useCallback(async (isCaller: boolean) => {
    if (!user || !callData) return;
    
    peerConnectionRef.current = new RTCPeerConnection(ICE_SERVERS);
    const pc = peerConnectionRef.current;
    
    // Get media devices
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localStreamRef.current = stream;
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
    
    // Add tracks to peer connection
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Handle remote stream
    pc.ontrack = (event) => {
      remoteStreamRef.current = event.streams[0];
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };
    
    // Handle ICE candidates
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
                await pc.addIceCandidate(new RTCIceCandidate(change.doc.data()));
                await deleteDoc(change.doc.ref);
            }
        }
    });
    
    return unsubscribeCandidates;

  }, [user, callId, callData]);


  // Effect for caller: create offer
  useEffect(() => {
    if (!user || !callData || !peerConnectionRef.current || callData.status !== 'ringing' || callData.callerId !== user.uid) return;
    
    const createOffer = async () => {
        const pc = peerConnectionRef.current!;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendOffer(callId, offer);
    };

    createOffer().catch(err => console.error("Error creating offer:", err));

  }, [user, callData, callId, peerConnectionRef]);

  // Effect for receiver: create answer
  useEffect(() => {
    if (!user || !callData || !peerConnectionRef.current || callData.status !== 'ringing' || callData.receiverId !== user.uid || !callData.offer) return;
    
    const createAnswer = async () => {
        const pc = peerConnectionRef.current!;
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer!));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendAnswer(callId, answer);
    };
    
    createAnswer().catch(err => console.error("Error creating answer:", err));

  }, [user, callData, callId, peerConnectionRef]);


  // Effect to apply received answer
  useEffect(() => {
    if (!user || !peerConnectionRef.current || !callData?.answer || callData.callerId !== user.uid) return;
    
    const pc = peerConnectionRef.current;
    if (pc.signalingState === 'have-local-offer') {
      pc.setRemoteDescription(new RTCSessionDescription(callData.answer)).catch(err => console.error("Error setting remote description:", err));
    }
  }, [user, callData?.answer, callData?.callerId]);


  useEffect(() => {
    if (user && callData) {
      const isCaller = callData.callerId === user.uid;
      const unsubscribePromise = setupWebRTC(isCaller);
      return () => {
        unsubscribePromise?.then(unsub => unsub());
      };
    }
  }, [user, callData, setupWebRTC]);


  const toggleMute = () => {
    if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !track.enabled;
        });
        setIsMuted(p => !p);
    }
  };
  
  const toggleVideo = () => {
      if (localStreamRef.current) {
          localStreamRef.current.getVideoTracks().forEach(track => {
              track.enabled = !track.enabled;
          });
          setIsVideoOff(p => !p);
      }
  };

  const switchCamera = async () => {
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop(); // Stop current track
          const newStream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: { exact: 'environment' } }
          }).catch(async () => {
              // Fallback to front camera if back is not available
              return navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          });

          const newTrack = newStream.getVideoTracks()[0];
          const sender = peerConnectionRef.current?.getSenders().find(s => s.track?.kind === 'video');
          if (sender) {
              sender.replaceTrack(newTrack);
          }
          localStreamRef.current = newStream;
          if (localVideoRef.current) {
              localVideoRef.current.srcObject = newStream;
          }
        }
      }
  };

  const partner = user?.uid === callData?.callerId ? callData?.receiverInfo : callData?.callerInfo;

  return (
    <div className="relative h-full w-full bg-black text-white">
        <video ref={remoteVideoRef} autoPlay playsInline className="h-full w-full object-cover" />
        
        <AnimatePresence>
            {!remoteStreamRef.current && (
                 <motion.div 
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/50 z-10 flex flex-col items-center justify-center gap-4"
                >
                    <Avatar className="h-32 w-32 border-4">
                        <AvatarImage src={partner?.photoURL || undefined} />
                        <AvatarFallback className="text-4xl">{partner?.username.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-3xl font-bold">{partner?.username}</h2>
                    <p className="text-xl text-white/80">{callData?.status === 'ringing' ? 'Bağlanıyor...' : 'Bekleniyor...'}</p>
                 </motion.div>
            )}
        </AnimatePresence>
        
        <motion.div
            drag
            dragMomentum={false}
            className="absolute top-4 right-4 h-48 w-32 z-20 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 cursor-grab"
        >
            <video ref={localVideoRef} autoPlay playsInline muted className={cn("h-full w-full object-cover", isVideoOff && "hidden")} />
            {isVideoOff && (
                <div className="h-full w-full bg-black flex items-center justify-center">
                    <VideoOff className="h-8 w-8"/>
                </div>
            )}
        </motion.div>
        
        <CallControls 
            onHangUp={hangUp}
            onToggleMute={toggleMute}
            isMuted={isMuted}
            onToggleVideo={toggleVideo}
            isVideoOff={isVideoOff}
            onSwitchCamera={switchCamera}
        />
    </div>
  );
}
