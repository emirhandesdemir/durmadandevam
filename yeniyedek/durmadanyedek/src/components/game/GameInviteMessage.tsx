// src/components/game/GameInviteMessage.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Swords, Check, X, Loader2 } from "lucide-react";
import type { Message } from "@/lib/types";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { respondToGameInvite } from '@/lib/actions/gameActions';
import { cn } from '@/lib/utils';

interface GameInviteMessageProps {
    message: Message;
    roomId: string;
}

export default function GameInviteMessage({ message, roomId }: GameInviteMessageProps) {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [isResponding, setIsResponding] = useState(false);

    if (!message.gameInviteData || !user || !userData) return null;

    const { host, gameName, invitedPlayers, acceptedPlayers, declinedPlayers, status } = message.gameInviteData;
    const isInvited = invitedPlayers.some(p => p.uid === user.uid);
    const hasResponded = acceptedPlayers.some(p => p.uid === user.uid) || declinedPlayers.some(p => p.uid === user.uid);

    const handleResponse = async (accepted: boolean) => {
        setIsResponding(true);
        try {
            await respondToGameInvite(roomId, message.id, { 
                uid: user.uid, 
                username: userData.username, 
                photoURL: userData.photoURL || null,
            }, accepted);
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
        } finally {
            setIsResponding(false);
        }
    };
    
    let statusText = "Oyuncuların kabul etmesi bekleniyor...";
    let statusColor = "text-muted-foreground";

    if (status === 'cancelled' || declinedPlayers.length > 0) {
        statusText = "Oyun daveti reddedildi veya iptal edildi.";
        statusColor = "text-destructive";
    } else if (status === 'accepted') {
        statusText = "Tüm oyuncular kabul etti. Oyun başlıyor!";
        statusColor = "text-green-600";
    }

    return (
        <Card className="my-4 bg-muted/50 border-primary/20">
            <CardHeader>
                <CardTitle className="flex items-center gap-3">
                    <Swords className="h-6 w-6 text-primary" />
                    Oyun Daveti
                </CardTitle>
                <CardDescription>
                    {host.username}, sizi bir <strong>{gameName}</strong> oyununa davet etti!
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-2">
                    <p className="text-sm font-semibold">Davet Edilenler:</p>
                    <div className="flex flex-wrap gap-2">
                        {invitedPlayers.map(p => {
                            const hasAccepted = acceptedPlayers.some(a => a.uid === p.uid);
                            const hasDeclined = declinedPlayers.some(d => d.uid === p.uid);
                            return (
                                <div key={p.uid} className={cn(
                                    "flex items-center gap-1.5 p-1.5 pr-2.5 rounded-full border bg-background text-xs font-medium",
                                    hasAccepted && "border-green-500/50 bg-green-500/10",
                                    hasDeclined && "border-destructive/50 bg-destructive/10 line-through"
                                )}>
                                    <Avatar className="h-5 w-5"><AvatarImage src={p.photoURL || undefined}/><AvatarFallback>{p.username.charAt(0)}</AvatarFallback></Avatar>
                                    <span>{p.username}</span>
                                    {hasAccepted && <Check className="h-4 w-4 text-green-600"/>}
                                    {hasDeclined && <X className="h-4 w-4 text-destructive"/>}
                                </div>
                            )
                        })}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex-col items-start gap-4">
                 <p className={cn("text-xs font-semibold italic", statusColor)}>{statusText}</p>
                 {isInvited && !hasResponded && status === 'pending' && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleResponse(true)} disabled={isResponding}>
                            {isResponding ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4 mr-2" />}
                            Kabul Et
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleResponse(false)} disabled={isResponding}>
                            <X className="h-4 w-4 mr-2" />
                            Reddet
                        </Button>
                    </div>
                )}
            </CardFooter>
        </Card>
    );
}
