// src/components/rooms/FeedRoomCard.tsx
'use client';

import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Room } from "@/lib/types";
import { Users, ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

interface FeedRoomCardProps {
    room: Room;
}

export default function FeedRoomCard({ room }: FeedRoomCardProps) {
    return (
        <div className="px-4">
            <Card className="bg-gradient-to-r from-primary/10 to-secondary/10 border-primary/20">
                <CardHeader>
                    <CardTitle className="text-lg">{room.name}</CardTitle>
                    <CardDescription className="line-clamp-2">{room.description}</CardDescription>
                </CardHeader>
                <CardFooter className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <div className="flex items-center -space-x-2">
                            {room.participants.slice(0, 3).map(p => (
                                <Avatar key={p.uid} className="h-6 w-6 border-2 border-background">
                                    <AvatarImage src={p.photoURL || undefined} />
                                    <AvatarFallback className="text-xs">{p.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Users className="h-4 w-4"/>
                            <span>{room.participants.length} / {room.maxParticipants}</span>
                        </div>
                    </div>
                    <Button asChild size="sm">
                        <Link href={`/rooms/${room.id}`}>
                            Katıl <ArrowRight className="ml-2 h-4 w-4"/>
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}