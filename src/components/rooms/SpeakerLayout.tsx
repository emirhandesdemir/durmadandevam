// src/components/rooms/SpeakerLayout.tsx
'use client';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import VoiceUserIcon from '../voice/VoiceUserIcon';
import type { Room } from '@/lib/types';
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

    return (
        <div className="flex justify-center p-3 border-b">
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
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
