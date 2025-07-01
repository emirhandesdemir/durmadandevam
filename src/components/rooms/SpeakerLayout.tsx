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
    const moderators = participants.filter(p => room.moderators.includes(p.uid) && p.uid !== room.createdBy.uid);
    const otherParticipants = participants.filter(p => !room.moderators.includes(p.uid) && p.uid !== room.createdBy.uid);

    // Sort participants: Host -> Moderators -> Others
    const sortedParticipants = [
        ...(host ? [host] : []),
        ...moderators,
        ...otherParticipants
    ];

    const maxVisible = 8;
    const visibleParticipants = sortedParticipants.slice(0, maxVisible);
    const emptySlots = Array(Math.max(0, maxVisible - visibleParticipants.length)).fill(null);

    return (
        <div className="flex justify-center p-3 border-b">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                {visibleParticipants.map((participant) => (
                    <VoiceUserIcon
                        key={participant.uid}
                        participant={participant}
                        room={room}
                        isHost={participant.uid === room.createdBy.uid}
                        isModerator={room.moderators.includes(participant.uid)}
                        currentUserId={user!.uid}
                        size="sm"
                    />
                ))}
                {emptySlots.map((_, index) => (
                     <div key={`placeholder-${index}`} className="flex flex-col items-center gap-2 w-16">
                        <div className="w-16 h-16 bg-card/20 rounded-full flex items-center justify-center border-2 border-dashed border-muted-foreground/30 opacity-50">
                            <Plus className="text-muted-foreground/50" />
                        </div>
                         {/* Placeholder for name to keep alignment */}
                        <div className="h-3.5 w-10 bg-transparent rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
