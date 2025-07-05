// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageSquare, Plus, PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, userData } = useAuth();

  const centerButtonConfig = useMemo(() => {
    if (pathname === '/rooms') {
      return {
        id: 'create-room',
        href: '/create-room',
        icon: PlusCircle,
        label: 'Oda Oluştur'
      };
    }
    // Default
    return {
      id: 'create-post',
      href: '/create-post',
      icon: Plus,
      label: 'Oluştur'
    };
  }, [pathname]);

  if (!user) {
    return null;
  }

  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/dm/') && pathname !== '/dm') || (pathname.startsWith('/call/'))) {
    return null;
  }
  
  const navItems = [
    {
      id: 'home',
      isActive: pathname === '/home',
      href: '/home',
      icon: Home,
      label: 'Anasayfa',
    },
    {
      id: 'rooms',
      isActive: pathname === '/rooms',
      href: '/rooms',
      icon: MessageSquare,
      label: 'Odalar',
    },
    {
      id: 'create',
      isActive: pathname === centerButtonConfig.href,
      href: centerButtonConfig.href,
      icon: centerButtonConfig.icon,
      label: centerButtonConfig.label,
    },
    {
      id: 'profile',
      isActive: pathname === `/profile/${user.uid}`,
      href: `/profile/${user.uid}`,
      label: 'Profil',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      'flex h-full w-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
                      item.isActive ? 'text-primary' : 'hover:text-primary'
                    )}
                  >
                    {item.id === 'profile' ? (
                      <div className="relative">
                        <div className={cn('avatar-frame-wrapper', userData?.selectedAvatarFrame)}>
                          <Avatar className={cn(
                            "relative z-[1] h-7 w-7 transition-all",
                            item.isActive && "ring-2 ring-primary ring-offset-background"
                          )}>
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    ) : (
                      Icon && <Icon className="h-6 w-6" />
                    )}
                    <span className="text-[11px] font-medium">{item.label}</span>
                  </Link>
                );
            })}
        </nav>
    </div>
  );
}
