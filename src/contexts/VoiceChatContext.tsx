// src/contexts/VoiceChatContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '../types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction, toggleVideo as toggleVideoAction, updateLastActive } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject',
        },
    ],
};

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteScreenStreams: Record<string, MediaStream>;
    remoteVideoStreams: Record<string, MediaStream>;
    localStream: MediaStream | null;
    isSharingScreen: boolean;
    isSharingVideo: boolean;
    setActiveRoomId: (id: string | null) => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    startVideo: () => Promise<void>;
    stopVideo: () => Promise<void>;
    joinRoom: (options?: { muted: boolean }) => Promise<void>;
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
    isMusicPlaying: boolean;
    startMusic: (file: File) => Promise<void>;
    stopMusic: () => Promise<void>;
    musicVolume: number;
    setMusicVolume: (volume: number) => void;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [connectedRoomId, setConnectedRoomId] = useState<string | null>(null);

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [isSharingVideo, setIsSharingVideo] = useState(false);
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteVideoStreams, setRemoteVideoStreams] = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
    const [isMusicPlaying, setIsMusicPlaying] = useState(false);
    const [musicVolume, setMusicVolume] = useState(0.5);

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const videoSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const audioAnalysers = useRef<Record<string, { analyser: AnalyserNode, dataArray: Uint8Array, context: AudioContext }>>({});
    const animationFrameId = useRef<number>();
    const lastActiveUpdateTimestamp = useRef<number>(0);
    const musicAudioRef = useRef<HTMLAudioElement | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const originalMicTrackRef = useRef<MediaStreamTrack | null>(null);
    const mixedStreamDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const musicGainNodeRef = useRef<GainNode | null>(null);

    const self = useMemo(() => participants.find(p => p.uid === user?.uid) || null, [participants, user?.uid]);
    const isConnected = !!self && !!connectedRoomId;
    const isSharingScreen = !!localScreenStream;
    
    const setMusicVolumeCallback = useCallback((volume: number) => {
        setMusicVolume(volume);
        if (musicGainNodeRef.current) {
            musicGainNodeRef.current.gain.value = volume;
        }
    }, []);

     const stopMusic = useCallback(async () => {
        if (!originalMicTrackRef.current) return;

        if (musicAudioRef.current) {
            musicAudioRef.current.pause();
            musicAudioRef.current.src = "";
            if (musicAudioRef.current.src) URL.revokeObjectURL(musicAudioRef.current.src);
            musicAudioRef.current = null;
        }

        for (const peerId in peerConnections.current) {
            const sender = peerConnections.current[peerId].getSenders().find(s => s.track?.kind === 'audio');
            if (sender) {
                await sender.replaceTrack(originalMicTrackRef.current);
            }
        }
        
        if (audioContextRef.current) {
            await audioContextRef.current.close();
            audioContextRef.current = null;
        }

        musicGainNodeRef.current = null;
        mixedStreamDestinationRef.current = null;
        originalMicTrackRef.current = null;
        setIsMusicPlaying(false);
    }, []);

    const _cleanupAndResetState = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);
        setIsSharingVideo(false);


        Object.values(audioAnalysers.current).forEach(({ context }) => context.close());
        audioAnalysers.current = {};
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        setRemoteVideoStreams({});
        screenSenderRef.current = {};
        videoSenderRef.current = {};
        setConnectedRoomId(null);
        setIsConnecting(false);
        stopMusic();
    }, [localStream, localScreenStream, stopMusic]);
    
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!connectedRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${connectedRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [connectedRoomId, user]);
    
    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream || peerConnections.current[otherUid]) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = e => {
            if (e.track.kind === 'audio') {
                 setRemoteAudioStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
            } else if (e.track.kind === 'video') {
                 // Differentiate between camera and screen share streams if needed
                 setRemoteVideoStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
            }
        };
        pc.onicecandidate = e => e.candidate && sendSignal(otherUid, 'ice-candidate', e.candidate.toJSON());
        
        if (user.uid > otherUid) {
             pc.onnegotiationneeded = async () => { 
                try { 
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    await sendSignal(otherUid, 'offer', pc.localDescription!.toJSON()); 
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
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await sendSignal(from, 'answer', pc.localDescription!.toJSON());
            } else if (type === 'answer') {
                if (pc.signalingState === 'have-local-offer') {
                    await pc.setRemoteDescription(new RTCSessionDescription(data));
                }
            } else if (type === 'ice-candidate' && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            }
        } catch (error) { console.error("Signal handling error:", type, error); }
    }, [createPeerConnection, sendSignal]);

    // Data listeners for room details and participants. Active whenever in a room.
    useEffect(() => {
        if (!user || !activeRoomId) {
            setActiveRoom(null);
            setParticipants([]);
            return;
        }

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), docSnap => {
            if (docSnap.exists()) {
                 setActiveRoom({id: docSnap.id, ...docSnap.data()} as Room)
            } else {
                 if(pathname.startsWith('/rooms/')) {
                    toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                    router.push('/rooms');
                 }
                 setActiveRoom(null);
                 setParticipants([]);
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);

            // If we think we are connected but our UID is not in the list, it means we were kicked.
            if (isConnected && user && !fetched.some(p => p.uid === user.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                _cleanupAndResetState();
            }
        });

        return () => { roomUnsub(); participantsUnsub(); };
    }, [user, activeRoomId, pathname, router, toast, isConnected, _cleanupAndResetState]);
    
    // WebRTC connection and signaling logic, only active when connected.
    useEffect(() => {
        if (!isConnected || !user) return () => {};

        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${connectedRoomId}/signals`), where('to', '==', user.uid)), s => {
             s.docChanges().forEach(async c => {
                if (c.type === 'added') {
                    await handleSignal(c.doc.data().from, c.doc.data().type, c.doc.data().data);
                    await deleteDoc(c.doc.ref);
                }
             })
        });
        
        const otherP = participants.filter(p => p.uid !== user.uid);
        otherP.forEach(p => createPeerConnection(p.uid));
        
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherP.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteScreenStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteVideoStreams(p => { const s = {...p}; delete s[uid]; return s; });
            }
        });
        
        return () => signalsUnsub();
    }, [participants, isConnected, user, connectedRoomId, handleSignal, createPeerConnection]);
    
    const joinRoom = useCallback(async (options?: { muted: boolean }) => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }, video: true });
            stream.getVideoTracks()[0].enabled = false;
            setLocalStream(stream);
            
            const result = await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL }, { initialMuteState: options?.muted });
            if (!result.success) {
                throw new Error(result.error || 'Sesli sohbete katılamadınız.');
            }
            setConnectedRoomId(activeRoomId);

        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);

    const leaveRoom = useCallback(async () => {
        if (!user || !connectedRoomId) return;
        await leaveVoiceChat(connectedRoomId, user.uid);
        _cleanupAndResetState();
    }, [user, connectedRoomId, _cleanupAndResetState]);

    const startMusic = useCallback(async (file: File) => {
        if (!isConnected || !localStream || isMusicPlaying) {
             toast({ variant: 'destructive', description: "Müzik başlatılamadı. Sesli sohbete bağlı olduğunuzdan emin olun." });
             return;
        }
        
        await stopMusic(); // Stop any previous music first

        try {
            const context = new AudioContext();
            audioContextRef.current = context;

            const micSource = context.createMediaStreamSource(localStream);
            originalMicTrackRef.current = localStream.getAudioTracks()[0];

            const musicElement = new Audio();
            musicAudioRef.current = musicElement;
            musicElement.src = URL.createObjectURL(file);
            musicElement.onended = stopMusic;
            
            const musicSource = context.createMediaElementSource(musicElement);

            const destination = context.createMediaStreamDestination();
            mixedStreamDestinationRef.current = destination;

            const gainNode = context.createGain();
            gainNode.gain.value = musicVolume;
            musicGainNodeRef.current = gainNode;

            micSource.connect(destination); // Mic -> Destination
            musicSource.connect(gainNode).connect(destination); // Music -> Gain -> Destination (for others)
            musicSource.connect(context.destination); // Music -> Local Speakers (for self)

            const mixedTrack = destination.stream.getAudioTracks()[0];

            for (const peerId in peerConnections.current) {
                const sender = peerConnections.current[peerId].getSenders().find(s => s.track?.kind === 'audio');
                if (sender) {
                    await sender.replaceTrack(mixedTrack);
                }
            }

            await musicElement.play();
            setIsMusicPlaying(true);
            toast({ description: "Müzik çalmaya başladı." });

        } catch (error: any) {
             console.error("Müzik başlatılırken hata:", error);
             toast({ variant: 'destructive', description: "Müzik başlatılamadı: " + error.message });
             await stopMusic();
        }

    }, [isConnected, localStream, isMusicPlaying, stopMusic, toast, musicVolume]);
    
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
            
            const isSpeaking = volume > 20;
            newSpeakingStates[uid] = isSpeaking;
            if (uid === user?.uid && isSpeaking) {
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
    
    const startScreenShare = useCallback(async () => {
        if (!user || !connectedRoomId || isSharingScreen) return;

        try {
            if (!navigator?.mediaDevices?.getDisplayMedia) {
                throw new Error('Tarayıcınız bu özelliği desteklemiyor gibi görünüyor.');
            }
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
             console.error("Screen share error:", error);
             let description = 'Ekran paylaşımı başlatılamadı.';
             if (error.name === 'NotAllowedError') {
                 description = 'Ekran paylaşımı için izin vermeniz gerekiyor. Lütfen tekrar deneyin ve tarayıcı istemine izin verin.';
             } else {
                description = `Bu özellik güncel bir tarayıcı ve güvenli (HTTPS) bir bağlantı gerektirebilir. Hata: ${error.message}`;
             }
            toast({ 
                variant: 'destructive', 
                title: 'Hata', 
                description: description
            });
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

     const startVideo = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream || isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = true;
            setIsSharingVideo(true);
            await toggleVideoAction(connectedRoomId, self.uid, true);
        }
    }, [self, connectedRoomId, localStream, isSharingVideo]);

    const stopVideo = useCallback(async () => {
        if (!self || !connectedRoomId || !localStream || !isSharingVideo) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = false;
            setIsSharingVideo(false);
            await toggleVideoAction(connectedRoomId, self.uid, false);
        }
    }, [self, connectedRoomId, localStream, isSharingVideo]);


    useEffect(() => {
        const setupAnalyser = (stream: MediaStream, uid: string) => {
            if (!audioAnalysers.current[uid]) {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 256;
                analyser.smoothingTimeConstant = 0.5;
                source.connect(analyser);
                audioAnalysers.current[uid] = { analyser, dataArray: new Uint8Array(analyser.frequencyBinCount), context };
            }
        };

        if (localStream && user) setupAnalyser(localStream, user.uid);
        Object.entries(remoteAudioStreams).forEach(([uid, stream]) => setupAnalyser(stream, uid));
        
        const currentUids = new Set([user?.uid, ...Object.keys(remoteAudioStreams)]);
        Object.keys(audioAnalysers.current).forEach(uid => {
            if (!currentUids.has(uid)) {
                audioAnalysers.current[uid]?.context.close();
                delete audioAnalysers.current[uid];
            }
        });

    }, [localStream, remoteAudioStreams, user]);

    useEffect(() => {
        if (isConnected) {
            animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
        } else {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        }
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [isConnected, runAudioAnalysis]);
    
    // Update microphone track based on speaking permission
    useEffect(() => {
        if (localStream && self) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) {
                const canSpeak = !activeRoom?.requestToSpeakEnabled || self.canSpeak || (activeRoom?.moderators.includes(self.uid));
                audioTrack.enabled = canSpeak && !self.isMuted;
            }
        }
    }, [self, localStream, activeRoom]);

    const memoizedParticipants = useMemo(() => {
        return participants.map(p => ({ ...p, isSpeaker: !!speakingStates[p.uid] }));
    }, [participants, speakingStates]);
    
    const value = {
        activeRoom, participants: memoizedParticipants, self, isConnecting, isConnected, remoteAudioStreams, remoteScreenStreams, remoteVideoStreams, localStream, isSharingScreen, isSharingVideo,
        setActiveRoomId, joinRoom, leaveRoom, toggleSelfMute, startScreenShare, stopScreenShare, startVideo, stopVideo, isMusicPlaying, startMusic, stopMusic, musicVolume, setMusicVolume: setMusicVolumeCallback
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
