// src/components/chat/PortalMessageCard.tsx
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap, ArrowRight } from "lucide-react";
import type { Message } from "@/lib/types";
import { joinRoom } from "@/lib/actions/roomActions";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface PortalMessageCardProps {
    message: Message;
}

export default function PortalMessageCard({ message }: PortalMessageCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const router = useRouter();
    const [isJoining, setIsJoining] = useState(false);
    
    const handleJoin = async () => {
        if (!user || !message.portalRoomId) return;
        setIsJoining(true);
        try {
             await joinRoom(message.portalRoomId, {
                uid: user.uid,
                username: user.displayName,
                photoURL: user.photoURL,
            });
            router.push(`/rooms/${message.portalRoomId}`);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setIsJoining(false);
        }
    };
    
    return (
        <Card className="bg-gradient-to-r from-primary/10 to-background border-primary/20 my-4 animate-in fade-in">
            <CardContent className="p-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                     <div className="p-2 bg-primary/20 rounded-full">
                        <Zap className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold">{message.text}</p>
                </div>
                 <Button onClick={handleJoin} disabled={isJoining} size="sm">
                    {isJoining ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <ArrowRight className="mr-2 h-4 w-4" />
                    )}
                    Katıl
                </Button>
            </CardContent>
        </Card>
    );
}
