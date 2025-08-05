// src/components/posts/SharePostDialog.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Search, Send, Check, MessageSquare, Plus, Users, User, ChevronRight } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';
import { getFollowingForSuggestions } from '@/lib/actions/suggestionActions';
import type { Post, UserProfile } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import { sendMessage, getRecentDmUsers } from '@/lib/actions/dmActions';
import { getChatId } from '@/lib/utils';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';
import { sendRoomMessage } from '@/lib/actions/roomActions';

interface SharePostDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  post: Post;
}

export default function SharePostDialog({ isOpen, onOpenChange, post }: SharePostDialogProps) {
  const { user: currentUser, userData } = useAuth();
  const { activeRoom } = useVoiceChat();
  const { toast } = useToast();
  
  const [allFollowing, setAllFollowing] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [recentDms, setRecentDms] = useState<Pick<UserProfile, 'uid' | 'username' | 'photoURL'>[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [sendingState, setSendingState] = useState<Record<string, 'sending' | 'sent'>>({});
  const [showAll, setShowAll] = useState(false);
  
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const loadInitialData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const recents = await getRecentDmUsers(currentUser.uid, 5);
      setRecentDms(recents);
    } catch (e) {
      console.error("Error fetching recent DMs:", e);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const loadAllFollowing = useCallback(async () => {
    if (!currentUser || allFollowing.length > 0) return;
    setLoading(true);
    try {
        const following = await getFollowingForSuggestions(currentUser.uid);
        setAllFollowing(following);
    } catch (e) {
        console.error("Error fetching all following:", e);
    } finally {
        setLoading(false);
    }
  }, [currentUser, allFollowing.length]);

  useEffect(() => {
    if (isOpen) {
      loadInitialData();
      // Reset state on open
      setShowAll(false);
      setSearchTerm('');
      setSelectedUserIds([]);
      setSendingState({});
    }
  }, [isOpen, loadInitialData]);

  const handleSendToUsers = async () => {
    if (!currentUser || !userData || selectedUserIds.length === 0) return;
    const usersToSend = [...recentDms, ...allFollowing].filter(f => selectedUserIds.includes(f.uid));
    const uniqueUsersToSend = Array.from(new Map(usersToSend.map(u => [u.uid, u])).values());

    for (const receiver of uniqueUsersToSend) {
      setSendingState(prev => ({ ...prev, [receiver.uid]: 'sending' }));
      try {
        const chatId = getChatId(currentUser.uid, receiver.uid);
        await sendMessage(chatId, {
            uid: currentUser.uid,
            username: userData.username,
            photoURL: userData.photoURL,
            profileEmoji: userData.profileEmoji,
        }, {
            uid: receiver.uid,
            username: receiver.username,
            photoURL: receiver.photoURL,
            profileEmoji: null,
        }, {
            text: `Bir gönderi paylaştı:`,
            sharedPost: post,
        });
        setSendingState(prev => ({ ...prev, [receiver.uid]: 'sent' }));
      } catch (error) {
        toast({ variant: 'destructive', description: `${receiver.username} adlı kullanıcıya gönderilemedi.` });
        setSendingState(prev => { const s = { ...prev }; delete s[receiver.uid]; return s; });
      }
    }
    toast({ description: `${uniqueUsersToSend.length} kişiye gönderildi.` });
  };
  
  const handleSendToRoom = async () => {
    if (!currentUser || !userData || !activeRoom) return;
    setSendingState(prev => ({...prev, 'room': 'sending'}));
    try {
        await sendRoomMessage(activeRoom.id, {
             uid: currentUser.uid,
             displayName: userData.username,
             photoURL: userData.photoURL,
        }, `shared_post:${post.id}`);
        toast({ description: "Gönderi odaya gönderildi." });
        setSendingState(prev => ({...prev, 'room': 'sent'}));
    } catch (error: any) {
        toast({ variant: 'destructive', description: "Gönderi odaya gönderilemedi." });
        setSendingState(prev => { const s = {...prev}; delete s['room']; return s;});
    }
};

  const handleShowAll = () => {
    setShowAll(true);
    loadAllFollowing();
  }

  const toggleSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const listSource = showAll ? allFollowing : recentDms;
  const filteredList = listSource.filter(f =>
    f.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[70vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Gönder</DialogTitle>
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
          {activeRoom && (
            <div className="p-2">
                <button 
                    onClick={handleSendToRoom}
                    disabled={sendingState['room'] === 'sending' || sendingState['room'] === 'sent'}
                    className="w-full flex items-center justify-between p-3 rounded-lg bg-primary/10 hover:bg-primary/20"
                >
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center"><MessageSquare className="h-5 w-5 text-primary-foreground"/></div>
                        <span className="font-semibold">{activeRoom.name} Odasına Gönder</span>
                    </div>
                     {sendingState['room'] === 'sending' ? <Loader2 className="h-5 w-5 animate-spin"/> : sendingState['room'] === 'sent' ? <Check className="h-5 w-5 text-green-500"/> : <Send className="h-5 w-5 text-muted-foreground"/>}
                </button>
            </div>
          )}
          {loading ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
          ) : filteredList.length > 0 ? (
            <div className="space-y-1 p-2">
              <p className="px-2 text-sm font-semibold text-muted-foreground">{showAll ? 'Tüm Takip Edilenler' : 'Son Konuşulanlar'}</p>
              {filteredList.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.photoURL || undefined} />
                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <p className="flex-1 font-semibold">{user.username}</p>
                  <Button
                    size="sm"
                    variant={selectedUserIds.includes(user.uid) ? 'default' : 'secondary'}
                    disabled={!!sendingState[user.uid]}
                    onClick={() => toggleSelection(user.uid)}
                    className="w-24"
                  >
                    {sendingState[user.uid] === 'sending' ? <Loader2 className="h-4 w-4 animate-spin"/> : sendingState[user.uid] === 'sent' ? <Check/> : selectedUserIds.includes(user.uid) ? 'Seçildi' : 'Seç'}
                  </Button>
                </div>
              ))}
              {!showAll && (
                  <Button variant="link" onClick={handleShowAll} className="w-full">
                      Daha Fazla Göster <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground pt-10">
              {searchTerm ? 'Sonuç bulunamadı.' : 'Takip ettiğin kimse yok.'}
            </p>
          )}
        </ScrollArea>
        {selectedUserIds.length > 0 && (
          <div className="p-4 border-t">
            <Button className="w-full" onClick={handleSendToUsers} disabled={Object.values(sendingState).some(s => s === 'sending')}>
              Gönder
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
