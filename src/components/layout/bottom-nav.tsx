'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageSquare, PlusSquare, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, userData } = useAuth();

  if (!user) {
    return null;
  }

  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/dm/') && pathname !== '/dm')) {
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
      isActive: pathname === '/rooms' || pathname === '/create-room',
      href: '/rooms',
      icon: MessageSquare,
      label: 'Odalar',
    },
    {
        id: 'matchmaking',
        isActive: pathname === '/matchmaking',
        href: '/matchmaking',
        icon: Swords,
        label: 'Eşleşme',
    },
    {
      id: 'create-post',
      isActive: pathname === '/create-post',
      href: '/create-post',
      icon: PlusSquare,
      label: 'Oluştur',
    },
    {
      id: 'profile',
      isActive: pathname.startsWith('/profile'),
      href: `/profile/${user.uid}`,
      label: 'Profil',
    },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="bg-background/80 backdrop-blur-md p-1.5 rounded-full shadow-lg pointer-events-auto mb-4 mx-auto">
        <nav className="flex items-center justify-around gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  'flex flex-col h-14 w-16 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300',
                  item.isActive ? 'text-primary' : 'hover:text-foreground'
                )}
              >
                {item.id === 'profile' ? (
                  <div className="relative">
                    <div className={cn('avatar-frame-wrapper', userData?.selectedAvatarFrame)}>
                      <Avatar className={cn(
                        "relative z-[1] h-7 w-7 transition-all",
                        item.isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                      )}>
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                    </div>
                  </div>
                ) : (
                  Icon && <Icon className="h-6 w-6" />
                )}
                <span className="text-xs font-medium mt-0.5">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
