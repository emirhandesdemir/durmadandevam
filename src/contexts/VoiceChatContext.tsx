'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { collection, onSnapshot, doc, addDoc, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Room, VoiceParticipant } from '@/lib/types';
import { joinVoiceChat, leaveVoiceChat, toggleSelfMute as toggleMuteAction, toggleScreenShare as toggleScreenShareAction } from '@/lib/actions/voiceActions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
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
    isSharingScreen: boolean;
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

    const [activeRoom, setActiveRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<VoiceParticipant[]>([]);
    const [isConnecting, setIsConnecting] = useState(false);
    
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
    const [remoteAudioStreams, setRemoteAudioStreams] = useState<Record<string, MediaStream>>({});
    const [remoteScreenStreams, setRemoteScreenStreams] = useState<Record<string, MediaStream>>({});
    const peerConnections = useRef<Record<string, RTCPeerConnection>>({});
    const screenSenderRef = useRef<Record<string, RTCRtpSender>>({});


    const self = participants.find(p => p.uid === user?.uid) || null;
    const isConnected = !!self;
    const isSharingScreen = !!localScreenStream;
    
    const cleanupConnections = useCallback(() => {
        console.log("Cleaning up all connections and resetting state.");
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};
        
        localStream?.getTracks().forEach(track => track.stop());
        localScreenStream?.getTracks().forEach(track => track.stop());
        setLocalStream(null);
        setLocalScreenStream(null);

        setRemoteAudioStreams({});
        setRemoteScreenStreams({});
        setParticipants([]);
        setActiveRoom(null);
        screenSenderRef.current = {};
    }, [localStream, localScreenStream]);
    
    const sendSignal = useCallback(async (to: string, type: string, data: any) => {
        if (!activeRoom || !user) return;
        const signalsRef = collection(db, `rooms/${activeRoom.id}/signals`);
        await addDoc(signalsRef, { to, from: user.uid, type, data, createdAt: serverTimestamp() });
    }, [activeRoom, user]);
    
    const stopScreenShare = useCallback(async () => {
        if (!user || !activeRoom || !localScreenStream) return;
        console.log("Stopping screen share");

        localScreenStream.getTracks().forEach(track => track.stop());
        setLocalScreenStream(null);

        for (const peerId in peerConnections.current) {
            const pc = peerConnections.current[peerId];
            const sender = screenSenderRef.current[peerId];
            if (sender) {
                pc.removeTrack(sender);
                delete screenSenderRef.current[peerId];
            }
        }
        
        await toggleScreenShareAction(activeRoom.id, user.uid, false);
    }, [user, activeRoom, localScreenStream]);

    const startScreenShare = useCallback(async () => {
        if (!user || !activeRoom || isSharingScreen) return;
        console.log("Starting screen share");
        
        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as MediaTrackConstraints,
                audio: false
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            if (!screenTrack) throw new Error("No screen track found");

            screenTrack.onended = () => stopScreenShare();
            setLocalScreenStream(screenStream);
            
            for (const peerId in peerConnections.current) {
                const pc = peerConnections.current[peerId];
                const sender = pc.addTrack(screenTrack, screenStream);
                screenSenderRef.current[peerId] = sender;
            }

            await toggleScreenShareAction(activeRoom.id, user.uid, true);
        } catch (error: any) {
            console.error("Screen share failed:", error);
            if (error.name === 'NotAllowedError') {
                toast({ variant: 'destructive', title: 'İzin Reddedildi', description: 'Ekran paylaşımı için izin vermelisiniz.' });
            } else {
                toast({ variant: 'destructive', title: 'Hata', description: 'Ekran paylaşımı başlatılamadı.' });
            }
        }
    }, [user, activeRoom, isSharingScreen, stopScreenShare, toast]);

    const createPeerConnection = useCallback((otherUid: string) => {
        if (!user || !localStream) return;
        if (peerConnections.current[otherUid]) return peerConnections.current[otherUid];

        console.log(`Creating peer connection to ${otherUid}`);
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnections.current[otherUid] = pc;
        
        localStream.getAudioTracks().forEach(track => pc.addTrack(track, localStream));

        pc.ontrack = event => {
            const stream = event.streams[0];
            if (event.track.kind === 'audio') {
                setRemoteAudioStreams(prev => ({ ...prev, [otherUid]: stream }));
            } else if (event.track.kind === 'video') {
                setRemoteScreenStreams(prev => ({ ...prev, [otherUid]: stream }));
            }
        };

        pc.onicecandidate = event => {
            if (event.candidate) {
                sendSignal(otherUid, 'ice-candidate', event.candidate.toJSON());
            }
        };

        const isInitiator = user.uid > otherUid;
        if (isInitiator) {
             pc.onnegotiationneeded = async () => {
                try {
                    await pc.setLocalDescription(await pc.createOffer());
                    if (pc.localDescription) {
                       await sendSignal(otherUid, 'offer', pc.localDescription.toJSON());
                    }
                } catch (e) { console.error("Negotiation error:", e); }
            };
        }
        return pc;
    }, [user, localStream, sendSignal]);

    const handleSignal = useCallback(async (from: string, type: string, data: any) => {
        const pc = peerConnections.current[from];
        if (!pc) return;

        try {
            if (type === 'offer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                if (pc.localDescription) await sendSignal(from, 'answer', pc.localDescription.toJSON());
            } else if (type === 'answer') {
                await pc.setRemoteDescription(new RTCSessionDescription(data));
            } else if (type === 'ice-candidate' && data && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data));
            }
        } catch (error) { console.error("Signal handling error:", type, error); }
    }, [sendSignal]);

    useEffect(() => {
        if (!user || !activeRoom) return;
        const currentRoomId = activeRoom.id;
        const roomUnsub = onSnapshot(doc(db, "rooms", currentRoomId), (docSnap) => {
            if (!docSnap.exists()) {
                toast({ title: "Oda Kapatıldı", description: "Bulunduğunuz oda kapatıldığı için bağlantınız kesildi.", variant: "destructive" });
                cleanupConnections();
                router.push('/rooms');
            }
        });
        const participantsUnsub = onSnapshot(collection(db, "rooms", currentRoomId, "voiceParticipants"), (snapshot) => {
            const fetchedParticipants = snapshot.docs.map(doc => doc.data() as VoiceParticipant);
            setParticipants(fetchedParticipants);
            if (isConnected && !fetchedParticipants.some(p => p.uid === user.uid)) {
                toast({ title: "Bağlantı Kesildi", description: "Sesten ayrıldınız veya atıldınız." });
                cleanupConnections();
            }
        });
        const signalsUnsub = onSnapshot(query(collection(db, `rooms/${currentRoomId}/signals`), where('to', '==', user.uid)), (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const signal = change.doc.data();
                    handleSignal(signal.from, signal.type, signal.data);
                    await deleteDoc(change.doc.ref).catch(e => console.error("Signal delete error:", e));
                }
            });
        });
        return () => { roomUnsub(); participantsUnsub(); signalsUnsub(); };
    }, [user, activeRoom, isConnected, cleanupConnections, handleSignal, router, toast]);
    
    useEffect(() => {
        if (!isConnected || !user || !localStream) return;
        const otherParticipants = participants.filter(p => p.uid !== user.uid);
        const existingPeerIds = Object.keys(peerConnections.current);
        otherParticipants.forEach(p => { if (!existingPeerIds.includes(p.uid)) createPeerConnection(p.uid); });
        existingPeerIds.forEach(uid => {
            if (!otherParticipants.some(p => p.uid === uid)) {
                peerConnections.current[uid]?.close();
                delete peerConnections.current[uid];
                setRemoteAudioStreams(prev => { const s = {...prev}; delete s[uid]; return s; });
                setRemoteScreenStreams(prev => { const s = {...prev}; delete s[uid]; return s; });
            }
        });
    }, [participants, isConnected, user, localStream, createPeerConnection]);

    const joinRoom = useCallback(async (roomToJoin: Room) => {
        if (!user || (isConnected && activeRoom?.id === roomToJoin.id) || isConnecting) return;
        if (activeRoom && activeRoom.id !== roomToJoin.id) {
             await leaveVoiceChat(activeRoom.id, user.uid);
             cleanupConnections();
        }
        setIsConnecting(true);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, sampleRate: 48000, channelCount: 2 }, video: false });
            setLocalStream(stream);
            const result = await joinVoiceChat(roomToJoin.id, { uid: user.uid, displayName: user.displayName, photoURL: user.photoURL });
            if (!result.success) throw new Error(result.error || 'Sesli sohbete katılırken bir hata oluştu.');
            setActiveRoom(roomToJoin);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Katılım Başarısız", description: error.message });
            cleanupConnections();
        } finally {
            setIsConnecting(false);
        }
    }, [user, isConnected, activeRoom, isConnecting, toast, cleanupConnections]);

    const leaveRoom = useCallback(async () => {
        if (!user || !activeRoom) return;
        await leaveVoiceChat(activeRoom.id, user.uid);
        cleanupConnections();
    }, [user, activeRoom, cleanupConnections]);
    
    const toggleSelfMute = useCallback(async () => {
        if (!self || !activeRoom || !localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            const newMutedState = !self.isMuted;
            audioTrack.enabled = !newMutedState;
            await toggleMuteAction(activeRoom.id, self.uid, newMutedState);
        }
    }, [self, activeRoom, localStream]);

    const value = {
        activeRoom, participants, self, isConnecting, isConnected, remoteAudioStreams, remoteScreenStreams, isSharingScreen,
        joinRoom, leaveRoom, toggleSelfMute, startScreenShare, stopScreenShare,
    };

    return (
        <VoiceChatContext.Provider value={value}>
            {children}
        </VoiceChatContext.Provider>
    );
}

export const useVoiceChat = () => {
    const context = useContext(VoiceChatContext);
    if (context === undefined) throw new Error('useVoiceChat, bir VoiceChatProvider içinde kullanılmalıdır');
    return context;
};
