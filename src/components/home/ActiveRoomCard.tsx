
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

interface ActiveRoomCardProps {
    id: string;
    name: string;
    topic: string;
    participantCount: number;
    capacity: number;
}

/**
 * Aktif Odalar listesinde tek bir odayı temsil eden kart.
 */
export default function ActiveRoomCard({ id, name, topic, participantCount, capacity }: ActiveRoomCardProps) {
    return (
        <Link href={`/rooms/${id}`} className="block">
            <Card className="p-4 transition-all duration-200 hover:bg-primary/10 hover:shadow-md hover:-translate-y-1">
                <div className="flex items-center justify-between">
                    <div className="flex-1 overflow-hidden">
                        <h4 className="truncate font-semibold">{name}</h4>
                        <p className="truncate text-sm text-muted-foreground">{topic}</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
                        <Users className="h-4 w-4" />
                        <span>{participantCount}/{capacity}</span>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
