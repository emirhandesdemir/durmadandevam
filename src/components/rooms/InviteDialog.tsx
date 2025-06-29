'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/lib/types';
import { Loader2, Search, Send, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { sendRoomInvite } from '@/lib/actions/roomActions';

interface InviteDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  roomName: string;
}

export default function InviteDialog({ isOpen, onOpenChange, roomId, roomName }: InviteDialogProps) {
    const { userData } = useAuth();
    const { toast } = useToast();
    const [followers, setFollowers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [invited, setInvited] = useState<string[]>([]);

    useEffect(() => {
        if (!isOpen || !userData?.following || userData.following.length === 0) {
            setFollowers([]);
            return;
        }
        const fetchFollowers = async () => {
            setLoading(true);
            try {
                // Firestore 'in' query has a limit of 30 items
                const followingIds = userData.following.slice(0, 30);
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('uid', 'in', followingIds));
                const snapshot = await getDocs(q);
                setFollowers(snapshot.docs.map(doc => doc.data() as UserProfile));
            } catch (e) {
                console.error("Takip edilenler getirilirken hata:", e);
                toast({ variant: 'destructive', description: 'Takip listeniz alınamadı.' });
            } finally {
                setLoading(false);
            }
        };
        fetchFollowers();
    }, [isOpen, userData, toast]);

    const handleInvite = async (inviteeId: string) => {
        if (!userData) return;
        setInvited(prev => [...prev, inviteeId]);
        try {
            await sendRoomInvite(roomId, roomName, {
                uid: userData.uid,
                username: userData.username,
                photoURL: userData.photoURL || null,
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            }, inviteeId);
            toast({ description: "Davet gönderildi." });
        } catch (error: any) {
            toast({ variant: 'destructive', description: error.message });
            setInvited(prev => prev.filter(id => id !== inviteeId));
        }
    };

    const filteredFollowers = followers.filter(f => 
        f.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Odaya Davet Et</DialogTitle>
                    <DialogDescription>Takip ettiğin kişileri odaya davet et.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Kişi ara..." className="pl-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <ScrollArea className="flex-1 -mx-6 px-2">
                    {loading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> : (
                        <div className="space-y-2 px-4">
                            {filteredFollowers.length > 0 ? filteredFollowers.map(follower => (
                                <div key={follower.uid} className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={follower.photoURL || ''} />
                                        <AvatarFallback>{follower.username.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <p className="flex-1 font-medium">{follower.username}</p>
                                    <Button
                                        size="sm"
                                        variant={invited.includes(follower.uid) ? 'secondary' : 'default'}
                                        disabled={invited.includes(follower.uid)}
                                        onClick={() => handleInvite(follower.uid)}
                                        className="w-28"
                                    >
                                        {invited.includes(follower.uid) ? <Check className="mr-2" /> : <Send className="mr-2" />}
                                        {invited.includes(follower.uid) ? 'Gönderildi' : 'Davet Et'}
                                    </Button>
                                </div>
                            )) : (
                                <p className="text-center text-muted-foreground pt-8">Takip ettiğiniz kimse bulunamadı.</p>
                            )}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    )
}
