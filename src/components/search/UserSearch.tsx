// src/components/search/UserSearch.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, Search, User, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { searchUsers } from '@/lib/actions/userActions';
import type { UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

function UserCard({ user }: { user: UserProfile }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            <Link href={`/profile/${user.uid}`} className="block">
                <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className={cn("avatar-frame-wrapper", user.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-12 w-12">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex-1">
                        <p className="font-bold">{user.username}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{user.bio || 'Henüz bir biyografi yok.'}</p>
                    </div>
                </div>
            </Link>
        </motion.div>
    );
}


export default function UserSearch() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const handleSearch = useCallback(async (term: string) => {
    if (!user || term.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await searchUsers(term, user.uid);
      setResults(users);
    } catch (error) {
      console.error("Kullanıcı arama hatası:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    handleSearch(debouncedSearchTerm);
  }, [debouncedSearchTerm, handleSearch]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Kullanıcı adı ile ara..."
          className="pl-10 text-base rounded-full py-6"
        />
        {searchTerm && (
            <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full"
                onClick={() => setSearchTerm('')}
            >
                <X className="h-5 w-5" />
            </Button>
        )}
      </div>

      <div className="min-h-[300px]">
        {loading ? (
          <div className="flex justify-center items-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence>
            {results.length > 0 ? (
              <div className="space-y-2">
                {results.map((user) => (
                  <UserCard key={user.uid} user={user} />
                ))}
              </div>
            ) : (
              searchTerm.length > 1 && (
                 <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-10 text-muted-foreground"
                >
                  <User className="h-12 w-12 mx-auto mb-2" />
                  <p>'{searchTerm}' için sonuç bulunamadı.</p>
                </motion.div>
              )
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
