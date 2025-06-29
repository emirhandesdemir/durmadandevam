'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '../types';
import { joinVoiceChat, leaveVoiceChat, updateLastActive, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    ],
};

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean;
    isMusicPlaying: boolean;
    isProcessingMusic: boolean;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteScreenStreams: Record<string, MediaStream>;
    localScreenStream: MediaStream | null;
    isSharingScreen: boolean;
    setActiveRoomId: (id: string | null) => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    joinRoom: () => Promise<void>;
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    playMusic: (file: File) => Promise<void>;
    stopMusic: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});

    // Müzik için State'ler ve Ref'ler
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [isProcessingMusic, setIsProcessingMusic] = useState(false);
    const musicAudioContextRef = useRef<AudioContext | null>(null);
    const musicAudioElementRef = useRef<HTMLAudioElement | null>(null);
    const localMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const musicSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
    const activeAudioTrackRef = useRef<MediaStreamTrack | null>(null);
    const audioSendersRef = useRef<Record<string, RTCRtpSender>>({});

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const audioAnalysers = useRef<Record<string, { analyser: AnalyserNode, dataArray: Uint8Array, context: AudioContext }>>({});
    const animationFrameId = useRef<number>();
    const lastActiveUpdateTimestamp = useRef<number>(0);

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;

    const _cleanupAndResetState = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);

        if (musicAudioElementRef.current) {
            musicAudioElementRef.current.pause();
            musicAudioElementRef.current.src = "";
        }
        musicAudioContextRef.current?.close();
        
        Object.values(audioAnalysers.current).forEach(({ context }) => context.close());
        audioAnalysers.current = {};
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        screenSenderRef.current = {};
        audioSendersRef.current = {};
        setParticipants([]);
        setActiveRoom(null);
        setConnectedRoomId(null);
        setIsConnecting(false);
        setIsMusicPlaying(false);
        setIsProcessingMusic(false);
    }, [localStream, localScreenStream]);

    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);

    const leaveRoom = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoiceChat(connectedRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, connectedRoomId, _cleanupAndResetState]);
    
    const stopScreenShare = useCallback(async () => {
        if (!user || !connectedRoomId || !localScreenStream) return;
        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
        for (const peerId in peerConnections.current) {
            const sender = screenSenderRef.current[peerId];
            if (sender) {
                peerConnections.current[peerId].removeTrack(sender);
                delete screenSenderRef.current[peerId];
            }
        }
        await toggleScreenShareAction(connectedRoomId, user.uid, false);
    }, [user, connectedRoomId, localScreenStream]);

    const runAudioAnalysis = useCallback(() => {
        const newSpeakingStates: Record<string, boolean> = {};
        let isSelfSpeaking = false;
        
        Object.entries(audioAnalysers.current).forEach(([uid, { analyser, dataArray }]) => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (const amplitude of dataArray) { sum += amplitude * amplitude; }
            const volume = Math.sqrt(sum / dataArray.length);
            
            newSpeakingStates[uid] = volume > 20;
            if (uid === user?.uid && newSpeakingStates[uid]) {
                isSelfSpeaking = true;
            }
        });
        
        if (JSON.stringify(newSpeakingStates) !== JSON.stringify(speakingStates)) {
             setSpeakingStates(newSpeakingStates);
        }

        if (isSelfSpeaking && user && connectedRoomId) {
            const now = Date.now();
            if (now - lastActiveUpdateTimestamp.current > 30000) { 
                lastActiveUpdateTimestamp.current = now;
                updateLastActive(connectedRoomId, user.uid);
            }
        }

        animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
    }, [user, connectedRoomId, speakingStates]);

    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!connectedRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${connectedRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [connectedRoomId, user]);

    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream || peerConnections.current[otherUid]) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        
        const track = activeAudioTrackRef.current || localStream.getAudioTracks()[0];
        if (track) {
            audioSendersRef.current[otherUid] = pc.addTrack(track, localStream);
        }

        pc.ontrack = e => e.track.kind === 'audio' ? setRemoteAudioStreams(p => ({ ...p, [otherUid]: e.streams[0] })) : setRemoteScreenStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
        pc.onicecandidate = e => e.candidate && sendSignal(otherUid, 'ice-candidate', e.candidate.toJSON());
        
        if (user.uid > otherUid) {
             pc.onnegotiationneeded = async () => { 
                try { 
                    await pc.setLocalDescription(await pc.createOffer()); 
                    if (pc.localDescription) await sendSignal(otherUid, 'offer', pc.localDescription.toJSON()); 
                } catch (e) { console.error("Nego error:", e); } 
            };
        }
        
        return pc;
    }, [user, localStream, sendSignal]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from] || createPeerConnection(from);
        if (!pc || !data) return;
        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                await pc.setLocalDescription(await pc.createAnswer());
                if(pc.localDescription) await sendSignal(from, 'answer', pc.localDescription.toJSON());
            } else if (type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'ice-candidate' && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            }
        } catch (error) { console.error("Signal handling error:", type, error); }
    }, [createPeerConnection, sendSignal]);
    
    const stopMusic = useCallback(async () => {
        if (!localStream) return;
        
        musicAudioElementRef.current?.pause();
        musicSourceNodeRef.current?.disconnect();
        
        const originalMicTrack = localStream.getAudioTracks()[0];
        activeAudioTrackRef.current = originalMicTrack;

        if (originalMicTrack) {
            for (const peerId in audioSendersRef.current) {
                await audioSendersRef.current[peerId].replaceTrack(originalMicTrack);
            }
        }
        setIsMusicPlaying(false);
    }, [localStream]);

    const playMusic = useCallback(async (file: File) => {
        if (!localStream || !user || !connectedRoomId || isProcessingMusic) return;
        setIsProcessingMusic(true);
        if (isMusicPlaying) await stopMusic();

        try {
            const audioEl = musicAudioElementRef.current || document.createElement('audio');
            audioEl.src = URL.createObjectURL(file);
            audioEl.loop = true;
            audioEl.muted = true;
            musicAudioElementRef.current = audioEl;

            const context = musicAudioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
            if (!musicAudioContextRef.current) musicAudioContextRef.current = context;
            
            if (!localMicSourceRef.current) localMicSourceRef.current = context.createMediaStreamSource(localStream);

            const musicSource = context.createMediaElementSource(audioEl);
            musicSourceNodeRef.current = musicSource;
            
            const destination = context.createMediaStreamDestination();
            localMicSourceRef.current.connect(destination);
            musicSource.connect(destination);
            
            const mixedTrack = destination.stream.getAudioTracks()[0];
            activeAudioTrackRef.current = mixedTrack;

            for (const peerId in audioSendersRef.current) {
                await audioSendersRef.current[peerId].replaceTrack(mixedTrack);
            }

            await audioEl.play();
            setIsMusicPlaying(true);
        } catch (e) {
            toast({ variant: 'destructive', description: "Müzik çalınırken bir hata oluştu."});
            await stopMusic();
        } finally {
            setIsProcessingMusic(false);
        }
    }, [localStream, user, connectedRoomId, isProcessingMusic, isMusicPlaying, stopMusic, toast]);


    const joinRoom = useCallback(async () => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
            setLocalStream(stream);
            activeAudioTrackRef.current = stream.getAudioTracks()[0];
            
            const result = await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL });
            if (!result.success) throw new Error(result.error || 'Sesli sohbete katılamadınız.');
            setConnectedRoomId(activeRoomId);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);
    
    const startScreenShare = useCallback(async () => {
        if (!user || !connectedRoomId || isSharingScreen) return;
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as MediaTrackConstraints, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error("No screen track found");
            screenTrack.onended = () => stopScreenShare();
            setLocalScreenStream(screenStream);
            for (const peerId in peerConnections.current) {
                screenSenderRef.current[peerId] = peerConnections.current[peerId].addTrack(screenTrack, screenStream);
            }
            await toggleScreenShareAction(connectedRoomId, user.uid, true);
        } catch (error: any) {
             let description = 'Ekran paylaşımı başlatılamadı.';
             if (error.name === 'NotAllowedError') description = 'Ekran paylaşımı için izin vermeniz gerekiyor.';
             toast({ variant: 'destructive', title: 'Hata', description });
        }
    }, [user, connectedRoomId, isSharingScreen, stopScreenShare, toast]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(connectedRoomId, self.uid, newMutedState);
            if (!newMutedState && user) {
                updateLastActive(connectedRoomId, user.uid);
                lastActiveUpdateTimestamp.current = Date.now();
            }
        }
    }, [self, connectedRoomId, localStream, user]);

    useEffect(() => {
        if (localStream && user) {
            const context = new (window.AudioContext || (window as any).webkitAudioContext)();
            const source = context.createMediaStreamSource(localStream);
            const analyser = context.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.5;
            source.connect(analyser);
            audioAnalysers.current[user.uid] = { analyser, dataArray: new Uint8Array(analyser.frequencyBinCount), context };
        }
    }, [localStream, user]);

    useEffect(() => {
        if (isConnected) animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
        else if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [isConnected, runAudioAnalysis]);
    
    useEffect(() => {
        if (!user || !connectedRoomId) return;
        const roomUnsub = onSnapshot(doc(db, "rooms", connectedRoomId), docSnap => {
            if (docSnap.exists()) setActiveRoom({id: docSnap.id, ...docSnap.data()} as Room);
            else {
                 toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil.' });
                 leaveRoom().then(() => { if(pathname.startsWith('/rooms/')) router.push('/rooms'); });
            }
        });
        const participantsUnsub = onSnapshot(collection(db, "rooms", connectedRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
            if (isConnected && user && !fetched.some(p => p.uid === user.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                _cleanupAndResetState();
            }
        });
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${connectedRoomId}/signals`), where('to', '==', user.uid)), s => {
             s.docChanges().forEach(async c => { if (c.type === 'added') { await handleSignal(c.doc.data().from, c.doc.data().type, c.doc.data().data); await deleteDoc(c.doc.ref); } });
        });
        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); };
    }, [user, connectedRoomId, isConnected, _cleanupAndResetState, handleSignal, toast, router, pathname, leaveRoom]);
    
    useEffect(() => {
        if (!isConnected || !user || !localStream) return;
        const otherP = participants.filter(p => p.uid !== user.uid);
        otherP.forEach(p => { if (!peerConnections.current[p.uid]) createPeerConnection(p.uid); });
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherP.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteScreenStreams(p => { const s = {...p}; delete s[uid]; return s; });
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection]);

    const memoizedParticipants = useMemo(() => {
        return participants.map(p => ({ ...p, isSpeaker: !!speakingStates[p.uid] }));
    }, [participants, speakingStates]);

    const value = {
        activeRoom, participants: memoizedParticipants, self, isConnecting, isConnected, remoteAudioStreams, remoteScreenStreams, isSharingScreen, localScreenStream,
        setActiveRoomId, joinRoom, leaveRoom, toggleSelfMute, startScreenShare, stopScreenShare, playMusic, stopMusic, isMusicPlaying, isProcessingMusic
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
