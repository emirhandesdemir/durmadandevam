'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchUsers } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface UserSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function UserSearchDialog({ isOpen, onOpenChange }: UserSearchDialogProps) {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  useEffect(() => {
    if (debouncedSearchTerm.length > 1 && currentUser) {
      setLoading(true);
      searchUsers(debouncedSearchTerm, currentUser.uid)
        .then(setResults)
        .finally(() => setLoading(false));
    } else {
      setResults([]);
    }
  }, [debouncedSearchTerm, currentUser]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[60vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Kullanıcı Ara</DialogTitle>
           <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Kullanıcı adı ile ara..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                />
            </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : results.length > 0 ? (
            <div className="space-y-1 p-2">
              {results.map((user) => (
                <Link
                  key={user.uid}
                  href={`/profile/${user.uid}`}
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                >
                  <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
                    <Avatar className="relative z-[1] h-10 w-10">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback>{user.profileEmoji || user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <p className="font-semibold">{user.username}</p>
                    {user.bio && <p className="text-xs text-muted-foreground line-clamp-1">{user.bio}</p>}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground pt-10">
              {debouncedSearchTerm.length > 1 ? 'Sonuç bulunamadı.' : 'Aramak için en az 2 karakter girin.'}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
