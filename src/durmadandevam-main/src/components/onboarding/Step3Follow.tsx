'use client';

import { useEffect, useState } from 'react';
import { getSuggestedUsers } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step3FollowProps {
    selectedUids: string[];
    onSelectionChange: (uids: string[]) => void;
}

export default function Step3Follow({ selectedUids, onSelectionChange }: Step3FollowProps) {
    const { user } = useAuth();
    const [suggestions, setSuggestions] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getSuggestedUsers(user.uid)
                .then(users => setSuggestions(users))
                .finally(() => setLoading(false));
        }
    }, [user]);

    const handleToggleFollow = (uid: string) => {
        const newSelection = selectedUids.includes(uid)
            ? selectedUids.filter(id => id !== uid)
            : [...selectedUids, uid];
        onSelectionChange(newSelection);
    };

    return (
        <div className="text-center">
            <h1 className="text-2xl font-bold">İlginç kişileri takip et</h1>
            <p className="text-muted-foreground mt-2">Başlangıç olarak birkaç kişiyi takip ederek akışını canlandır.</p>
            <ScrollArea className="mt-8 h-[300px] rounded-xl border">
                 {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <Loader2 className="h-6 w-6 animate-spin"/>
                    </div>
                ) : (
                    <div className="p-2 space-y-1">
                        {suggestions.map(suggestedUser => {
                            const isSelected = selectedUids.includes(suggestedUser.uid);
                            return (
                                <div 
                                    key={suggestedUser.uid} 
                                    className="flex items-center justify-between p-2 rounded-lg"
                                >
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={suggestedUser.photoURL || undefined} />
                                            <AvatarFallback>{suggestedUser.username.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="font-semibold">{suggestedUser.username}</p>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{suggestedUser.bio}</p>
                                        </div>
                                    </div>
                                    <Button 
                                        size="sm"
                                        variant={isSelected ? "default" : "outline"}
                                        onClick={() => handleToggleFollow(suggestedUser.uid)}
                                        className="w-24"
                                    >
                                        {isSelected && <Check className="mr-2 h-4 w-4" />}
                                        {isSelected ? 'Takip' : 'Takip Et'}
                                    </Button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
