// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Plus, Compass, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  
  const handleSurfClick = (e: React.MouseEvent) => {
    if (pathname === '/surf') {
      e.preventDefault();
      const surfContainer = document.querySelector('[data-surf-feed-container]');
      surfContainer?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSurfDoubleClick = (e: React.MouseEvent) => {
    if (pathname === '/surf') {
      e.preventDefault();
      router.refresh();
    }
  };

  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
        { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
        { id: 'matchmaking', href: '/matchmaking', icon: Swords, label: 'Eşleşme' },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'surf', href: '/surf', icon: Compass, label: 'Surf', onClick: handleSurfClick, onDoubleClick: handleSurfDoubleClick },
      ]
  }, [user, pathname, router]);

  if (!user) {
    return null;
  }

  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'))) {
    return null;
  }
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href ? (item.id === 'rooms' ? pathname.startsWith('/rooms') : pathname === item.href) : false;
                  
                  return (
                    <Link
                      key={item.id}
                      href={item.href || '#'}
                      onClick={item.id === 'surf' ? handleSurfClick : undefined}
                      onDoubleClick={item.id === 'surf' ? handleSurfDoubleClick : undefined}
                      className={cn(
                        'flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
                        isActive ? 'text-primary' : 'hover:text-primary',
                        item.id === 'create' ? 'relative -top-3' : ''
                      )}
                    >
                      <div className={cn("flex items-center justify-center h-8 w-12 rounded-full", isActive && item.id !== 'create' ? 'bg-primary/10' : '')}>
                         <Icon className={cn("h-6 w-6", item.id === 'create' && 'h-10 w-10 text-primary bg-primary/20 p-2 rounded-full')} />
                      </div>
                      {item.id !== 'create' && (
                          <span className="text-[10px] font-medium">{item.label}</span>
                      )}
                    </Link>
                  );
              })}
          </nav>
      </div>
    </>
  );
}
