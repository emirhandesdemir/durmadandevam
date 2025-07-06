// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Radio, Waves, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (!user) {
    return null;
  }
  
  const navItems = [
    { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
    { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
    { id: 'create', href: '/create-post', icon: Plus, label: 'Oluştur'},
    { id: 'surf', href: '/surf', icon: Waves, label: 'Sörf' },
    { id: 'profile', href: `/profile/${user.uid}`, icon: Avatar, label: 'Profil' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                // Simplified active check
                const isActive = (item.id === 'create' && pathname === item.href) || 
                               (item.id !== 'create' && pathname.startsWith(item.href) && (pathname.length === item.href.length || pathname[item.href.length] === '/'));

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
