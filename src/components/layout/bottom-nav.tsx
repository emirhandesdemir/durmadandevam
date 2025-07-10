// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Compass, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface BottomNavProps {
  onExploreClick: () => void;
  isExploreMenuOpen: boolean;
}

export default function BottomNav({ onExploreClick, isExploreMenuOpen }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
        { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
        { id: 'explore', href: '#', icon: Compass, label: 'Keşfet', onClick: onExploreClick },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'profile', href: `/profile/${user.uid}`, icon: User, label: 'Profil' },
      ]
  }, [user, onExploreClick]);

  if (!user) {
    return null;
  }
  
  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'))) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? (item.id === 'rooms' ? pathname.startsWith('/rooms') : pathname === item.href) : false;
                
                const isExploreButton = item.id === 'explore';
                const buttonActiveStyle = isExploreButton ? isExploreMenuOpen : isActive;

                return (
                  <Link
                    key={item.id}
                    href={item.href || '#'}
                    onClick={(e) => {
                      if (item.onClick) {
                        e.preventDefault();
                        item.onClick();
                      }
                    }}
                    className={cn(
                      'flex h-full w-full flex-col items-center justify-center gap-1 transition-colors',
                      buttonActiveStyle ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                      item.id === 'create' ? 'relative -top-3' : ''
                    )}
                  >
                    <div className={cn(
                      "flex items-center justify-center h-8 w-12 rounded-full transition-all duration-300", 
                      buttonActiveStyle && item.id !== 'create' ? 'bg-primary/10' : ''
                    )}>
                       <Icon className={cn(
                         "h-6 w-6 transition-transform", 
                         item.id === 'create' && 'h-10 w-10 text-primary bg-primary/20 p-2 rounded-full',
                         isExploreButton && isExploreMenuOpen && 'rotate-180'
                        )} />
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
