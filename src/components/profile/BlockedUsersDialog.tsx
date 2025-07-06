// src/components/profile/BlockedUsersDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Loader2, UserX } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { unblockUser } from '@/lib/actions/userActions';

interface BlockedUsersDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  blockedUserIds: string[];
}

export default function BlockedUsersDialog({ isOpen, onOpenChange, blockedUserIds }: BlockedUsersDialogProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [blockedUsers, setBlockedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || blockedUserIds.length === 0) {
      setBlockedUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers: UserProfile[] = [];
        for (let i = 0; i < blockedUserIds.length; i += 30) {
          const batchIds = blockedUserIds.slice(i, i + 30);
          if (batchIds.length === 0) continue;
          const q = query(collection(db, 'users'), where('uid', 'in', batchIds));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            fetchedUsers.push(doc.data() as UserProfile);
          });
        }
        setBlockedUsers(fetchedUsers);
      } catch (error) {
        console.error('Engellenen kullanıcılar getirilirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, blockedUserIds]);

  const handleUnblock = async (targetId: string) => {
    if (!currentUser) return;
    setUnblockingId(targetId);
    try {
        await unblockUser(currentUser.uid, targetId);
        toast({ description: "Kullanıcının engeli kaldırıldı." });
        setBlockedUsers(prev => prev.filter(u => u.uid !== targetId));
    } catch (e: any) {
        toast({ variant: 'destructive', description: "Engel kaldırılamadı." });
    } finally {
        setUnblockingId(null);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Engellenen Hesaplar</DialogTitle>
          <DialogDescription>
            Bu listedeki kullanıcılar profilinizi göremez ve sizinle etkileşim kuramaz.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : blockedUsers.length > 0 ? (
            <div className="space-y-2 px-4">
              {blockedUsers.map((user) => (
                <div key={user.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted">
                    <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold">{user.username}</span>
                    </div>
                    <Button 
                        size="sm"
                        variant="outline"
                        onClick={() => handleUnblock(user.uid)}
                        disabled={unblockingId === user.uid}
                    >
                        {unblockingId === user.uid ? <Loader2 className='h-4 w-4 animate-spin'/> : "Engeli Kaldır"}
                    </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-center">
                <UserX className="h-10 w-10 mb-2"/>
                <p>Engellenen kimse yok.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
