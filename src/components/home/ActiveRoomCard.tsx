
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Radio } from 'lucide-react';

interface ActiveRoomCardProps {
    id: string;
    name: string;
    topic: string;
}

/**
 * Aktif Odalar listesinde tek bir odayı temsil eden kart.
 */
export default function ActiveRoomCard({ id, name, topic }: ActiveRoomCardProps) {
    return (
        <Link href={`/rooms/${id}`} className="block">
            <Card className="p-4 transition-all duration-200 hover:bg-primary/10 hover:shadow-md hover:-translate-y-1">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 overflow-hidden">
                        <h4 className="truncate font-semibold">{name}</h4>
                        <p className="truncate text-sm text-muted-foreground">{topic}</p>
                    </div>
                    <Radio className="h-5 w-5 flex-shrink-0 text-primary" />
                </div>
            </Card>
        </Link>
    );
}
