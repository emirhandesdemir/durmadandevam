"use client";

import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Repeat, Heart, Upload, MoreHorizontal, Star } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Room {
    id: string;
    name: string;
    topic: string;
    creatorName: string;
    createdAt: Timestamp;
}

interface PostCardProps {
    room: Room;
}

export default function PostCard({ room }: PostCardProps) {
    const timeAgo = room.createdAt
        ? formatDistanceToNow(room.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    const creatorInitial = room.creatorName?.charAt(0).toUpperCase() || 'H';

    return (
        <Card>
            <CardHeader className="flex-row items-start gap-4 space-y-0 p-4">
                <Avatar>
                    <AvatarFallback>{creatorInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold">{room.creatorName}</p>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                    </div>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
                <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-5 w-5" />
                </Button>
            </CardHeader>
            <CardContent className="p-4 pt-0">
                <p>
                    <span className="font-bold">{room.name} ✨</span> Yeni, etkileyici sesli sohbet deneyimi, sesli sohbet odalarında oyun deneyimi 💎
                </p>
            </CardContent>
            <CardFooter className="flex justify-between p-4 pt-0">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <MessageCircle className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Repeat className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Heart className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Upload className="h-5 w-5"/>
                </Button>
            </CardFooter>
        </Card>
    );
}
