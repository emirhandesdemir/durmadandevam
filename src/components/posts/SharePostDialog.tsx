// src/components/posts/SharePostDialog.tsx
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Send, Check } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { getFollowingForSuggestions } from '@/lib/actions/suggestionActions';
import type { Post, UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage } from '@/lib/actions/dmActions';
import { getChatId } from '@/lib/utils';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';

interface SharePostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export default function SharePostDialog({ isOpen, onOpenChange, post }: SharePostDialogProps) {
  const { user: currentUser, userData } = useAuth();
  const { toast } = useToast();
  const [followers, setFollowers] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendingState, setSendingState] = useState<Record<string, 'sending' | 'sent'>>({});
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  useEffect(() => {
    if (!isOpen || !currentUser) return;
    setLoading(true);
    getFollowingForSuggestions(currentUser.uid)
      .then(setFollowers)
      .finally(() => setLoading(false));
  }, [isOpen, currentUser]);

  const handleSend = async () => {
    if (!currentUser || !userData || selectedUserIds.length === 0) return;

    const usersToSend = followers.filter(f => selectedUserIds.includes(f.uid));

    for (const receiver of usersToSend) {
      setSendingState(prev => ({ ...prev, [receiver.uid]: 'sending' }));
      try {
        const chatId = getChatId(currentUser.uid, receiver.uid);
        await sendMessage(chatId, {
            uid: currentUser.uid,
            username: userData.username,
            photoURL: userData.photoURL,
            profileEmoji: userData.profileEmoji,
        }, {
            receiver: {
                uid: receiver.uid,
                username: receiver.username,
                photoURL: receiver.photoURL,
                profileEmoji: null,
            }
        }, {
            text: `Bu gönderiye bir göz at!`,
            sharedPost: post,
        });
        setSendingState(prev => ({ ...prev, [receiver.uid]: 'sent' }));
      } catch (error) {
        toast({ variant: 'destructive', description: `${receiver.username} adlı kullanıcıya gönderilemedi.` });
        setSendingState(prev => { const s = { ...prev }; delete s[receiver.uid]; return s; });
      }
    }
    toast({ description: `${usersToSend.length} kişiye gönderildi.` });
    onOpenChange(false);
    setSelectedUserIds([]);
  };

  const toggleSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const filteredFollowers = followers.filter(f =>
    f.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Gönderiyi Paylaş</DialogTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Kişi ara..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </DialogHeader>
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredFollowers.length > 0 ? (
            <div className="space-y-1 p-2">
              {filteredFollowers.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                  onClick={() => toggleSelection(user.uid)}
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(user.uid)}
                    readOnly
                    className="h-5 w-5 rounded-full border-gray-300 text-primary focus:ring-primary"
                  />
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="font-semibold">{user.username}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground pt-10">
              {searchTerm ? 'Sonuç bulunamadı.' : 'Takip ettiğin kimse yok.'}
            </p>
          )}
        </ScrollArea>
        {selectedUserIds.length > 0 && (
          <div className="p-4 border-t">
            <Button className="w-full" onClick={handleSend} disabled={Object.values(sendingState).some(s => s === 'sending')}>
              Gönder
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
