"use client";

import { useState } from 'react';
import { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mic, MicOff, PhoneOff, Headphones, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface VoiceChatPanelProps {
  currentUser: User | null;
}

const mockParticipants = [
  { id: '1', name: 'Ayşe', avatar: 'https://i.pravatar.cc/150?u=ayse' },
  { id: '2', name: 'Mehmet', avatar: 'https://i.pravatar.cc/150?u=mehmet' },
  { id: '3', name: 'Zeynep', avatar: 'https://i.pravatar.cc/150?u=zeynep' },
];


export default function VoiceChatPanel({ currentUser }: VoiceChatPanelProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isInVoiceChannel, setIsInVoiceChannel] = useState(false);

  const handleToggleMute = () => setIsMuted(!isMuted);
  const handleToggleDeafen = () => setIsDeafened(!isDeafened);
  const handleToggleVoiceChannel = () => setIsInVoiceChannel(!isInVoiceChannel);

  const allParticipants = isInVoiceChannel && currentUser 
    ? [{ id: currentUser.uid, name: currentUser.displayName || 'Siz', avatar: currentUser.photoURL || '' }, ...mockParticipants] 
    : mockParticipants;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Sesli Sohbet</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between gap-4">
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground">KATILIMCILAR — {allParticipants.length}</h3>
            <div className="grid grid-cols-3 gap-4">
                {allParticipants.map(p => (
                    <TooltipProvider key={p.id}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="flex flex-col items-center gap-2">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={p.avatar} />
                                        <AvatarFallback>{p.name?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm truncate">{p.name}</span>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>{p.name}</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                ))}
            </div>
        </div>

        {isInVoiceChannel ? (
            <div className="flex items-center justify-center gap-2 p-2 bg-secondary rounded-lg">
                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant={isMuted ? 'destructive' : 'ghost'} size="icon" onClick={handleToggleMute}>
                                {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isMuted ? 'Susturmayı Kaldır' : 'Sustur'}</p>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>

                 <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" onClick={handleToggleDeafen}>
                                {isDeafened ? <Headphones className="h-5 w-5 text-destructive" /> : <Headphones className="h-5 w-5" />}
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>{isDeafened ? 'Sağırlaştırmayı Kaldır' : 'Sağırlaştır'}</p>
                        </TooltipContent>
                    </Tooltip>
                 </TooltipProvider>
                
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button variant="destructive" size="icon" onClick={handleToggleVoiceChannel}>
                                <PhoneOff className="h-5 w-5" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Ayrıl</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        ) : (
            <Button onClick={handleToggleVoiceChannel} className="w-full">
                <Mic className="mr-2" /> Sesli Sohbete Katıl
            </Button>
        )}
      </CardContent>
    </Card>
  );
}
