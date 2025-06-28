'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, PlusSquare, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useState, useEffect } from 'react';
import type { Room } from '@/lib/types';
import { collection, query, where, onSnapshot, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import RoomManagementDialog from '@/components/rooms/RoomManagementDialog';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userData } = useAuth();
  const [userRoom, setUserRoom] = useState<Room | null | 'loading'>('loading');
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserRoom(null);
      return;
    }
    const q = query(collection(db, 'rooms'), where('createdBy.uid', '==', user.uid), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setUserRoom({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Room);
      } else {
        setUserRoom(null);
      }
    });
    return () => unsubscribe();
  }, [user]);

  if (!user) {
    return null;
  }

  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/dm/') && pathname !== '/dm')) {
    return null;
  }

  const navItems = [
    {
      id: 'home',
      isActive: pathname === '/home' || pathname === '/create-post',
      href: pathname === '/home' ? '/create-post' : '/home',
      icon: pathname === '/home' ? PlusSquare : Home,
      label: pathname === '/home' ? 'Oluştur' : 'Anasayfa',
    },
    {
      id: 'rooms',
      isActive: pathname === '/rooms' || pathname === '/create-room',
      href: (pathname === '/rooms' && userRoom) ? '#' : (pathname === '/rooms' ? '/create-room' : '/rooms'),
      icon: (pathname === '/rooms' && userRoom) ? Settings : (pathname === '/rooms' ? PlusSquare : MessageSquare),
      label: (pathname === '/rooms' && userRoom) ? 'Yönet' : (pathname === '/rooms' ? 'Oluştur' : 'Odalar'),
      onClick: (pathname === '/rooms' && userRoom) ? () => setIsManagementOpen(true) : undefined,
    },
    {
      id: 'profile',
      isActive: pathname.startsWith('/profile'),
      href: `/profile/${user.uid}`,
      icon: pathname.startsWith('/profile') ? Settings : null,
      label: pathname.startsWith('/profile') ? 'Ayarlar' : 'Profil',
    },
  ];

  return (
    <>
      <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
        <div className="bg-background/80 backdrop-blur-md p-2 rounded-full border shadow-lg pointer-events-auto">
          <nav className="flex items-center justify-around gap-2">
            {navItems.map((item) => {
              if (!item) return null;
              const Icon = item.icon;

              const actionProps = item.onClick
                ? { onClick: item.onClick, role: 'button' }
                : { href: item.href };
              
              const Component = item.href === '#' ? 'button' : Link;

              return (
                <Component
                  key={item.id}
                  {...actionProps}
                  className={cn(
                    'flex flex-col h-14 w-16 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300',
                    item.isActive ? 'text-primary' : 'hover:text-foreground'
                  )}
                >
                  {item.id === 'profile' && !item.isActive ? (
                    <div className="relative">
                      <div className={cn('avatar-frame-wrapper', userData?.selectedAvatarFrame)}>
                        <Avatar className="relative z-[1] h-7 w-7">
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                    </div>
                  ) : (
                    Icon && <Icon className="h-6 w-6" />
                  )}
                  <span className="text-xs font-medium">{item.label}</span>
                </Component>
              );
            })}
          </nav>
        </div>
      </div>
      <RoomManagementDialog
        isOpen={isManagementOpen}
        setIsOpen={setIsManagementOpen}
        room={userRoom !== 'loading' ? userRoom : null}
      />
    </>
  );
}
