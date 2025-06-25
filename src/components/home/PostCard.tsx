
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';

interface PostCardProps {
    avatar: string;
    name: string;
    time: string;
    text: string;
    image?: string;
    imageHint?: string;
}

/**
 * Gönderi akışında tek bir gönderiyi temsil eden kart bileşeni.
 */
export default function PostCard({ avatar, name, time, text, image, imageHint }: PostCardProps) {
    return (
        <Card className="overflow-hidden shadow-md transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar>
                    <AvatarImage src={avatar} />
                    <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold">{name}</p>
                    <p className="text-xs text-muted-foreground">{time}</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                <p className="whitespace-pre-wrap">{text}</p>
                {image && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image
                            src={image}
                            alt="Gönderi resmi"
                            fill
                            className="object-cover"
                            data-ai-hint={imageHint}
                        />
                    </div>
                )}
            </CardContent>
            <CardFooter className="p-2">
                {/* Gelecekteki beğeni ve yorum özellikleri için yer tutucular */}
                <Button variant="ghost" className="w-full text-muted-foreground">
                    <Heart className="mr-2" /> Beğen
                </Button>
                <Button variant="ghost" className="w-full text-muted-foreground">
                    <MessageCircle className="mr-2" /> Yorum Yap
                </Button>
            </CardFooter>
        </Card>
    );
}
