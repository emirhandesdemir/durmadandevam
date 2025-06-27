'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '../types';
import { joinVoiceChat, leaveVoiceChat, updateLastActive, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };
const SPEAKING_THRESHOLD = -50; // dB

interface VoiceChatContextType {
    activeRoom: Room | null;
    participants: VoiceParticipant[];
    self: VoiceParticipant | null;
    isConnecting: boolean;
    isConnected: boolean;
    remoteAudioStreams: Record<string, MediaStream>;
    remoteScreenStreams: Record<string, MediaStream>;
    localScreenStream: MediaStream | null;
    isSharingScreen: boolean;
    setActiveRoomId: (id: string | null) => void;
    startScreenShare: () => Promise<void>;
    stopScreenShare: () => Promise<void>;
    joinRoom: (roomToJoin: Room) => Promise<void>;
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
}

const VoiceChatContext = createContext<VoiceChatContextType | undefined>(undefined);

export function VoiceChatProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [speakingStates, setSpeakingStates] = useState<Record<string, boolean>>({});
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const audioAnalysers = useRef<Record<string, { analyser: AnalyserNode, dataArray: Uint8Array, context: AudioContext }>>({});
    const animationFrameId = useRef<number>();

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;
    
    const cleanupConnections = useCallback(() => {
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);

        Object.values(audioAnalysers.current).forEach(({ context }) => context.close());
        audioAnalysers.current = {};
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);

        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        screenSenderRef.current = {};
    }, [localStream, localScreenStream]);

    const stopAndCleanup = useCallback(() => {
        cleanupConnections();
        setParticipants([]);
        setActiveRoom(null);
    }, [cleanupConnections]);

    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoom, user]);
    
    // Audio Analysis Loop
    const runAudioAnalysis = useCallback(() => {
        const newSpeakingStates: Record<string, boolean> = {};
        let activeSpeakerFound = false;
        Object.entries(audioAnalysers.current).forEach(([uid, { analyser, dataArray }]) => {
            analyser.getFloatFrequencyData(dataArray);
            let sum = 0;
            for (const amplitude of dataArray) { sum += amplitude * amplitude; }
            const volume = Math.sqrt(sum / dataArray.length);
            const isSpeaking = volume > 0.01; // Adjusted threshold
            if (isSpeaking) {
                newSpeakingStates[uid] = true;
                activeSpeakerFound = true;
            } else {
                newSpeakingStates[uid] = false;
            }
        });
        setSpeakingStates(newSpeakingStates);

        if (activeSpeakerFound && user && activeRoomId) {
            updateLastActive(activeRoomId, user.uid);
        }

        animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
    }, [user, activeRoomId]);

    // Setup Analysers
    useEffect(() => {
        const setupAnalyser = (stream: MediaStream, uid: string) => {
            if (!audioAnalysers.current[uid]) {
                const context = new (window.AudioContext || (window as any).webkitAudioContext)();
                const source = context.createMediaStreamSource(stream);
                const analyser = context.createAnalyser();
                analyser.fftSize = 512;
                analyser.smoothingTimeConstant = 0.5;
                source.connect(analyser);
                audioAnalysers.current[uid] = { analyser, dataArray: new Float32Array(analyser.frequencyBinCount), context };
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

    // Start/stop analysis loop
    useEffect(() => {
        if (isConnected) {
            animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
        } else {
            if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
        }
        return () => { if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current); };
    }, [isConnected, runAudioAnalysis]);

    const stopScreenShare = useCallback(async () => {
        if (!user || !activeRoom || !localScreenStream) return;
        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
        for (const peerId in peerConnections.current) {
            const sender = screenSenderRef.current[peerId];
            if (sender) {
                peerConnections.current[peerId].removeTrack(sender);
                delete screenSenderRef.current[peerId];
            }
        }
        await toggleScreenShareAction(activeRoom.id, user.uid, false);
    }, [user, activeRoom, localScreenStream]);

    const startScreenShare = useCallback(async () => {
        if (!user || !activeRoom || isSharingScreen || !navigator?.mediaDevices?.getDisplayMedia) return;
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "always" } as MediaTrackConstraints, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error("No screen track found");

            screenTrack.onended = () => stopScreenShare();
            setLocalScreenStream(screenStream);
            
            for (const peerId in peerConnections.current) {
                screenSenderRef.current[peerId] = peerConnections.current[peerId].addTrack(screenTrack, screenStream);
            }
            await toggleScreenShareAction(activeRoom.id, user.uid, true);
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.name === 'NotAllowedError' ? 'Ekran paylaşımı için izin vermelisiniz.' : 'Ekran paylaşımı başlatılamadı.' });
        }
    }, [user, activeRoom, isSharingScreen, stopScreenShare, toast]);

    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream || peerConnections.current[otherUid]) return;

        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        localStream.getAudioTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = e => e.track.kind === 'audio' ? setRemoteAudioStreams(p => ({ ...p, [otherUid]: e.streams[0] })) : setRemoteScreenStreams(p => ({ ...p, [otherUid]: e.streams[0] }));
        pc.onicecandidate = e => e.candidate && sendSignal(otherUid, 'ice-candidate', e.candidate.toJSON());
        if (user.uid > otherUid) pc.onnegotiationneeded = async () => { try { await pc.setLocalDescription(await pc.createOffer()); if (pc.localDescription) await sendSignal(otherUid, 'offer', pc.localDescription.toJSON()); } catch (e) { console.error("Nego error:", e); } };
        
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
    
    // Main listener setup based on activeRoomId
    useEffect(() => {
        if (!user || !activeRoomId) {
            stopAndCleanup();
            return;
        };

        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), docSnap => setActiveRoom(docSnap.exists() ? {id: docSnap.id, ...docSnap.data()} as Room : null));
        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
            if (isConnected && !fetched.some(p => p.uid === user.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                stopAndCleanup();
            }
        });
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${activeRoomId}/signals`), where('to', '==', user.uid)), s => s.docChanges().forEach(async c => c.type === 'added' && (await handleSignal(c.doc.data().from, c.doc.data().type, c.doc.data().data), await deleteDoc(c.doc.ref))));
        
        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); };
    }, [activeRoomId, user, isConnected, stopAndCleanup, handleSignal, toast]);

    // Peer connection manager
    useEffect(() => {
        if (!isConnected || !user || !localStream) return;
        const otherP = participants.filter(p => p.uid !== user.uid);
        otherP.forEach(p => createPeerConnection(p.uid));
        Object.keys(peerConnections.current).forEach(uid => {
            if (!otherP.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(p => { const s = {...p}; delete s[uid]; return s; });
                setRemoteScreenStreams(p => { const s = {...p}; delete s[uid]; return s; });
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection]);

    // AFK updater
    useEffect(() => {
        if (!isConnected || !user || !activeRoomId) return;
        const interval = setInterval(() => updateLastActive(activeRoomId, user.uid), 60 * 1000);
        return () => clearInterval(interval);
    }, [isConnected, user, activeRoomId]);

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || (isConnected && activeRoom?.id === roomToJoin.id) || isConnecting) return;
        if (activeRoom && activeRoom.id !== roomToJoin.id) await leaveRoom();
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }, video: false });
            setLocalStream(stream);
            const result = await joinVoiceChat(roomToJoin.id, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL });
            if (!result.success) throw new Error(result.error);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            stopAndCleanup();
        } finally { setIsConnecting(false); }
    }, [user, isConnected, activeRoom, isConnecting, toast, stopAndCleanup, leaveRoom]);

    const leaveRoom = useCallback(async () => {
        if (!user || !activeRoom) return;
        await leaveVoiceChat(activeRoom.id, user.uid);
        stopAndCleanup();
        router.push('/rooms');
    }, [user, activeRoom, stopAndCleanup, router]);
    
    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoom || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = self.isMuted; // Toggle: if muted, enable it
            await toggleMuteAction(activeRoom.id, self.uid, !self.isMuted);
            if (!self.isMuted && user) await updateLastActive(activeRoom.id, user.uid);
        }
    }, [self, activeRoom, localStream, user]);

    const memoizedParticipants = useMemo(() => {
        return participants.map(p => ({ ...p, isSpeaker: !!speakingStates[p.uid] }));
    }, [participants, speakingStates]);

    const value = {
        activeRoom, participants: memoizedParticipants, self, isConnecting, isConnected, remoteAudioStreams, remoteScreenStreams, isSharingScreen, localScreenStream,
        setActiveRoomId, joinRoom, leaveRoom, toggleSelfMute, startScreenShare, stopScreenShare,
    };

    return <VoiceChatContext.Provider value={value}>{children}</VoiceChatContext.Provider>;
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
