// src/components/profile/FollowListDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import UserListItem from './UserListItem';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';

interface FollowListDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userIds: string[];
  type: 'followers' | 'following';
}

export default function FollowListDialog({
  isOpen,
  onOpenChange,
  userIds,
  type,
}: FollowListDialogProps) {
  const { userData: currentUserData } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || userIds.length === 0) {
      setUsers([]);
      return;
    }

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const fetchedUsers: UserProfile[] = [];
        // Firestore 'in' sorgusu en fazla 30 eleman alabilir, bu yüzden listeyi böl
        for (let i = 0; i < userIds.length; i += 30) {
          const batchIds = userIds.slice(i, i + 30);
          const q = query(
            collection(db, 'users'),
            where('uid', 'in', batchIds)
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((doc) => {
            fetchedUsers.push(doc.data() as UserProfile);
          });
        }
        setUsers(fetchedUsers);
      } catch (error) {
        console.error('Kullanıcı listesi alınırken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [isOpen, userIds]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="capitalize">
            {type === 'followers' ? 'Takipçiler' : 'Takip Edilenler'}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-2">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1 px-4">
              {users.map((user) => (
                <UserListItem key={user.uid} user={user} currentUserData={currentUserData} />
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-full text-muted-foreground">
                <p>Burada gösterilecek kimse yok.</p>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
