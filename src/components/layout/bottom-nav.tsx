// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, MessageCircle, Plus, Compass, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo, useState } from 'react';
import UserSearchDialog from '../search/UserSearchDialog';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  if (!user) {
    return null;
  }

  // Hide nav on specific full-screen pages
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'))) {
    return null;
  }

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
  
  const navItems = useMemo(() => [
    { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
    { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
    { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
    { id: 'surf', href: '/surf', icon: Compass, label: 'Surf', onClick: handleSurfClick, onDoubleClick: handleSurfDoubleClick },
    { id: 'search', icon: Search, label: 'Ara' },
  ], [pathname, router]);

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
          <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href ? (item.id === 'rooms' ? pathname.startsWith('/rooms') : pathname === item.href) : false;
                  
                  if (item.id === 'search') {
                      return (
                          <button
                              key={item.id}
                              onClick={() => setIsSearchOpen(true)}
                              className={cn(
                                'flex h-full w-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors hover:text-primary'
                              )}
                          >
                            <Icon className="h-6 w-6" />
                            <span className="text-[10px] font-medium">{item.label}</span>
                          </button>
                      );
                  }

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={item.onClick}
                      onDoubleClick={item.onDoubleClick}
                      className={cn(
                        'flex h-full w-16 flex-col items-center justify-center gap-1 text-muted-foreground transition-colors',
                        isActive ? 'text-primary' : 'hover:text-primary'
                      )}
                    >
                      <div className="relative">
                         <Icon className={cn("h-6 w-6", item.id === 'create' && 'h-8 w-8 text-primary bg-primary/20 p-1.5 rounded-full')} />
                      </div>
                      {item.id !== 'create' && (
                          <span className="text-[10px] font-medium">{item.label}</span>
                      )}
                    </Link>
                  );
              })}
          </nav>
      </div>
      <UserSearchDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
    </>
  );
}
