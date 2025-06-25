
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle } from 'lucide-react';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export interface Post {
    id: string;
    authorId: string;
    authorName: string;
    authorPhotoURL: string | null;
    content: string;
    createdAt: Timestamp;
    imageUrl?: string;
    imageHint?: string;
}

interface PostCardProps {
    post: Post;
}

/**
 * Gönderi akışında tek bir gönderiyi temsil eden kart bileşeni.
 */
export default function PostCard({ post }: PostCardProps) {
    const timeAgo = post.createdAt
        ? formatDistanceToNow(post.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "şimdi";
        
    const authorInitial = post.authorName?.charAt(0).toUpperCase() || '?';

    return (
        <Card className="overflow-hidden shadow-md transition-shadow hover:shadow-lg">
            <CardHeader className="flex flex-row items-center gap-4 p-4">
                <Avatar>
                    <AvatarImage src={post.authorPhotoURL || undefined} />
                    <AvatarFallback>{authorInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold">{post.authorName}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
                <p className="whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                        <Image
                            src={post.imageUrl}
                            alt="Gönderi resmi"
                            fill
                            className="object-cover"
                            data-ai-hint={post.imageHint}
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
