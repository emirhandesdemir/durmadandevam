'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '../types';
import { joinVoiceChat, leaveVoiceChat, updateLastActive, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { usePathname, useRouter } from 'next/navigation';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

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
    joinRoom: () => Promise<void>;
    leaveRoom: () => Promise<void>;
    toggleSelfMute: () => Promise<void>;
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

    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});
    const audioAnalysers = useRef<Record<string, { analyser: AnalyserNode, dataArray: Uint8Array, context: AudioContext }>>({});
    const animationFrameId = useRef<number>();
    const speakingStatesRef = useRef<Record<string, boolean>>({});

    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;

    // 1. Core helper functions with minimal dependencies
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoomId || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoomId}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoomId, user]);
    
    const _cleanupAndResetState = useCallback(() => {
        console.log("Cleaning up all connections and state.");
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
        setParticipants([]);
        setActiveRoom(null);
        setIsConnecting(false);
    }, [localStream, localScreenStream]);

    // 2. Functions dependent on helpers above
    const leaveRoom = useCallback(async () => {
        if (!user || !activeRoomId) return;
        await leaveVoiceChat(activeRoomId, user.uid);
        _cleanupAndResetState();
        setActiveRoomId(null);
    }, [user, activeRoomId, _cleanupAndResetState]);
    
    const stopScreenShare = useCallback(async () => {
        if (!user || !activeRoomId || !localScreenStream) return;
        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);
        for (const peerId in peerConnections.current) {
            const sender = screenSenderRef.current[peerId];
            if (sender) {
                peerConnections.current[peerId].removeTrack(sender);
                delete screenSenderRef.current[peerId];
            }
        }
        await toggleScreenShareAction(activeRoomId, user.uid, false);
    }, [user, activeRoomId, localScreenStream]);

    const runAudioAnalysis = useCallback(() => {
        const newSpeakingStates: Record<string, boolean> = {};
        let activeSpeakerFound = false;
        Object.entries(audioAnalysers.current).forEach(([uid, { analyser, dataArray }]) => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (const amplitude of dataArray) { sum += amplitude * amplitude; }
            const volume = Math.sqrt(sum / dataArray.length);
            if (volume > 20) {
                newSpeakingStates[uid] = true;
                activeSpeakerFound = true;
            } else {
                newSpeakingStates[uid] = false;
            }
        });

        if (JSON.stringify(newSpeakingStates) !== JSON.stringify(speakingStatesRef.current)) {
            speakingStatesRef.current = newSpeakingStates;
            setSpeakingStates(newSpeakingStates);
        }

        if (activeSpeakerFound && user && activeRoomId) {
            updateLastActive(activeRoomId, user.uid);
        }

        animationFrameId.current = requestAnimationFrame(runAudioAnalysis);
    }, [user, activeRoomId]);

    // 3. Inter-dependent WebRTC functions (order matters here)
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

    // 4. Main user-facing actions
    const joinRoom = useCallback(async () => {
        if (!user || !activeRoomId || isConnected || isConnecting) return;
        
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000 }, video: false });
            setLocalStream(stream);
            
            const result = await joinVoiceChat(activeRoomId, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL });
            if (!result.success) {
                throw new Error(result.error || 'Sesli sohbete katılamadınız.');
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            _cleanupAndResetState();
        } finally {
            setIsConnecting(false);
        }
    }, [user, activeRoomId, isConnected, isConnecting, toast, _cleanupAndResetState]);
    
    const startScreenShare = useCallback(async () => {
        if (!user || !activeRoomId || isSharingScreen) {
            return;
        }

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
            await toggleScreenShareAction(activeRoomId, user.uid, true);
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
    }, [user, activeRoomId, isSharingScreen, stopScreenShare, toast]);

    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoomId || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoomId, self.uid, newMutedState);
            if (!newMutedState && user) { // If unmuted
                await updateLastActive(activeRoomId, user.uid);
            }
        }
    }, [self, activeRoomId, localStream, user]);


    // --- Side Effects (useEffect hooks) ---
    
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
    
    useEffect(() => {
        if (!user || !activeRoomId) {
            if(isConnected) _cleanupAndResetState();
            return;
        };
        
        const roomUnsub = onSnapshot(doc(db, "rooms", activeRoomId), docSnap => {
            if (docSnap.exists()) {
                 setActiveRoom({id: docSnap.id, ...docSnap.data()} as Room)
            } else {
                 toast({ variant: 'destructive', title: 'Oda Bulunamadı', description: 'Bu oda artık mevcut değil veya süresi dolmuş.' });
                 leaveRoom().then(() => { if(pathname.startsWith('/rooms/')) router.push('/rooms'); });
            }
        });

        const participantsUnsub = onSnapshot(collection(db, "rooms", activeRoomId, "voiceParticipants"), snapshot => {
            const fetched = snapshot.docs.map(d => d.data() as VoiceParticipant);
            setParticipants(fetched);
            if (isConnected && fetched.every(p => p.uid !== user?.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                _cleanupAndResetState();
            }
        });
        
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${activeRoomId}/signals`), where('to', '==', user.uid)), s => {
             s.docChanges().forEach(async c => {
                if (c.type === 'added') {
                    await handleSignal(c.doc.data().from, c.doc.data().type, c.doc.data().data);
                    await deleteDoc(c.doc.ref);
                }
             })
        });
        
        return () => { 
            roomUnsub(); 
            participantsUnsub(); 
            signalsUnsub(); 
        };
    }, [activeRoomId, user, isConnected, _cleanupAndResetState, handleSignal, toast, router, pathname, leaveRoom]);
    
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

    useEffect(() => {
        if (!isConnected || !user || !activeRoomId) return;
        const interval = setInterval(() => updateLastActive(activeRoomId, user.uid), 60 * 1000);
        return () => clearInterval(interval);
    }, [isConnected, user, activeRoomId]);

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
