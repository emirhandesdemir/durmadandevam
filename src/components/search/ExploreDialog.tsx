'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Flame, Star } from 'lucide-react';
import { getPopularUsers, getTopFollowedUsers } from '@/lib/actions/analyticsActions';
import type { UserProfile } from '@/lib/types';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';

interface ExploreDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function UserList({ users, onOpenChange }: { users: UserProfile[], onOpenChange: (open: boolean) => void }) {
    if (users.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Görünüşe göre burada kimse yok.</p>;
    }

    return (
        <div className="space-y-1 p-2">
            {users.map((user) => (
                <Link
                    key={user.uid}
                    href={`/profile/${user.uid}`}
                    onClick={() => onOpenChange(false)}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                >
                    <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div>
                        <p className="font-semibold">{user.username}</p>
                        {user.bio && <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>}
                    </div>
                </Link>
            ))}
        </div>
    );
}

export default function ExploreDialog({ isOpen, onOpenChange }: ExploreDialogProps) {
  const [popularUsers, setPopularUsers] = useState<UserProfile[]>([]);
  const [topFollowed, setTopFollowed] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      Promise.all([
        getPopularUsers(),
        getTopFollowedUsers(),
      ]).then(([popular, followed]) => {
        setPopularUsers(popular as UserProfile[]);
        setTopFollowed(followed as UserProfile[]);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to load explore data:", err);
        setLoading(false);
      });
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Keşfet</DialogTitle>
           <DialogDescription>
            Popüler ve en çok takipçiye sahip kullanıcıları keşfet.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="popular" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-2 mt-2 px-2">
                <TabsTrigger value="popular"><Flame className="mr-2 h-4 w-4"/> Popüler</TabsTrigger>
                <TabsTrigger value="top-followed"><Star className="mr-2 h-4 w-4"/> En İyiler</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
                 {loading ? (
                    <div className="flex justify-center items-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : (
                    <>
                        <TabsContent value="popular">
                           <UserList users={popularUsers} onOpenChange={onOpenChange} />
                        </TabsContent>
                        <TabsContent value="top-followed">
                            <UserList users={topFollowed} onOpenChange={onOpenChange} />
                        </TabsContent>
                    </>
                )}
            </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
