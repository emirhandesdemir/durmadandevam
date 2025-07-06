// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Radio, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
    { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
    { id: 'create', href: '/create-post', icon: Plus, label: 'Oluştur'},
    { id: 'live', href: '/live', icon: Radio, label: 'Canlı' },
    { id: 'profile', href: `/profile/${user?.uid}`, icon: Avatar, label: 'Profil' },
  ], [user?.uid]);
  
  if (!user) {
    return null;
  }
  
  // A clearer, more robust way to determine the active link.
  const getIsActive = (itemId: string, itemHref: string, currentPathname: string) => {
    // For dynamic routes, we check if the path starts with the base.
    if (itemId === 'profile') {
      return currentPathname.startsWith('/profile');
    }
    if (itemId === 'rooms') {
      return currentPathname.startsWith('/rooms');
    }
    // For all other routes, we want an exact match.
    return currentPathname === itemHref;
  };


  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = getIsActive(item.id, item.href, pathname);

                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex h-full w-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
                      isActive ? 'text-primary' : 'hover:text-primary'
                    )}
                  >
                    <div className="relative">
                       {item.id === 'profile' ? (
                            <Avatar className={cn("h-7 w-7 transition-all", isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                       ) : (
                            <Icon className={cn("h-6 w-6", item.id === 'create' && 'h-8 w-8 text-primary bg-primary/20 p-1.5 rounded-full')} />
                       )}
                    </div>
                    {item.id !== 'create' && (
                        <span className="text-[10px] font-medium">{item.label}</span>
                    )}
                  </Link>
                );
            })}
        </nav>
    </div>
  );
}
