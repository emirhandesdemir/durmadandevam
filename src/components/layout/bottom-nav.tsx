// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'))) {
    return null;
  }
  
  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
    { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
    { id: 'create-post', href: '/create-post', icon: Plus, label: 'Oluştur'},
    { id: 'matchmaking', href: '/matchmaking', icon: Swords, label: 'Eşleşme' },
    { id: 'profile', href: `/profile/${user.uid}`, icon: Avatar, label: 'Profil' },
  ], [user.uid]);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === 'rooms' ? pathname.startsWith('/rooms') : item.id === 'matchmaking' ? pathname.startsWith('/matchmaking') : pathname === item.href;
                
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
                            <Icon className={cn("h-6 w-6", item.id === 'create-post' && 'h-8 w-8 text-primary bg-primary/20 p-1.5 rounded-full')} />
                       )}
                    </div>
                    {item.id !== 'create-post' && (
                        <span className="text-[10px] font-medium">{item.label}</span>
                    )}
                  </Link>
                );
            })}
        </nav>
    </div>
  );
}
