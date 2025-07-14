// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, userData } = useAuth();
  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
        { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'surf', href: '/surf', icon: Clapperboard, label: 'Surf' },
        { id: 'profile', href: `/profile/${user.uid}`, icon: Avatar, label: 'Profil' },
      ]
  }, [user]);

  if (!user) {
    return null;
  }
  
  const isFullPageLayout = (pathname.startsWith('/rooms/') && pathname !== '/rooms') || 
                           (pathname.startsWith('/call/')) || 
                           (pathname.startsWith('/surf'));

  if (isFullPageLayout) {
    return null;
  }
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
          <nav className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = (item.id === 'rooms' && pathname.startsWith('/rooms')) || pathname === item.href;
                  
                  const isCreateButton = item.id === 'create';

                  return (
                    <Link
                      key={item.id}
                      href={item.href || '#'}
                      className={cn(
                        'flex h-full flex-col items-center justify-center gap-1 transition-colors',
                        isCreateButton ? '' : (isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary')
                      )}
                    >
                        <div className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300", 
                            isCreateButton ? 'bg-primary text-primary-foreground rounded-xl h-9 w-9' : ''
                        )}>
                             {item.id === 'profile' ? (
                                <Avatar className={cn("h-7 w-7 transition-all", isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
                                    <AvatarImage src={userData?.photoURL || undefined} />
                                    <AvatarFallback>{userData?.profileEmoji || userData?.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <Icon className={cn("h-6 w-6 transition-transform")} />
                            )}
                        </div>
                        {!isCreateButton && <span className="text-[10px] font-medium">{item.label}</span>}
                    </Link>
                  );
              })}
          </nav>
      </div>
    </>
  );
}
