// src/components/rooms/SpeakerLayout.tsx
'use client';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import VoiceUserIcon from '../voice/VoiceUserIcon';
import type { Room } from '@/lib/types';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface SpeakerLayoutProps {
    room: Room;
}

export default function SpeakerLayout({ room }: SpeakerLayoutProps) {
    const { user } = useAuth();
    const { participants } = useVoiceChat();
    const host = participants.find(p => p.uid === room.createdBy.uid);
    const otherParticipants = participants.filter(p => p.uid !== room.createdBy.uid);
    const slots = Array(8).fill(null);

    return (
        <div className="flex flex-col items-center gap-4 py-6 px-4">
            {host && (
                <VoiceUserIcon 
                    participant={host} 
                    room={room} 
                    isHost={true} 
                    isModerator={true} 
                    currentUserId={user!.uid} 
                    size="lg" 
                />
            )}
            
            <div className="grid grid-cols-4 gap-4 w-full max-w-sm mt-4">
                {slots.map((_, index) => {
                    const participant = otherParticipants[index];
                    return (
                        <div key={index} className="aspect-square flex items-center justify-center">
                            {participant ? (
                                <VoiceUserIcon 
                                    participant={participant} 
                                    room={room} 
                                    isHost={participant.uid === room.createdBy.uid} 
                                    isModerator={room.moderators.includes(participant.uid)} 
                                    currentUserId={user!.uid} 
                                    size="sm"
                                />
                            ) : (
                                <div className="w-16 h-16 bg-card/20 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30">
                                    <Plus className="text-muted-foreground/50" />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
}
