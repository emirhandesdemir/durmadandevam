// src/components/rooms/SpeakerLayout.tsx
'use client';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import VoiceUserIcon from '../voice/VoiceUserIcon';
import type { Room } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

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
    
    // Dynamically adjust grid columns based on participant count
    const getGridColsClass = () => {
        const count = sortedParticipants.length;
        if (count <= 4) return 'grid-cols-4';
        if (count <= 6) return 'grid-cols-6';
        return 'grid-cols-8'; // Max 8 on one row, will wrap if more
    }

    return (
        <div className="flex justify-center p-3 relative z-10">
             <div className={cn("grid gap-2", getGridColsClass())}>
                {sortedParticipants.map((participant) => (
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
            </div>
        </div>
    );
}
