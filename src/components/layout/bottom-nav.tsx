// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Clapperboard, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';

interface BottomNavProps {
  onSearchClick: () => void;
}

export default function BottomNav({ onSearchClick }: BottomNavProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
        { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'surf', href: '/surf', icon: Clapperboard, label: 'Surf' },
      ]
  }, [user]);

  if (!user) {
    return null;
  }
  
  const isFullPageLayout = (pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'));

  if (isFullPageLayout) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href ? pathname === item.href || (item.href !== '/home' && pathname.startsWith(item.href)) : false;
                
                const isCreateButton = item.id === 'create';

                return (
                  <Link
                    key={item.id}
                    href={item.href || '#'}
                    className={cn(
                      'flex h-full flex-1 flex-col items-center justify-center transition-colors',
                       isCreateButton ? '' : (isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary')
                    )}
                  >
                     <div className={cn(
                        "relative flex flex-col items-center justify-center gap-1 transition-all duration-200"
                     )}>
                        <div className={cn(
                            "flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300", 
                            isCreateButton ? 'bg-primary text-primary-foreground' : (isActive ? 'bg-primary/10' : '')
                        )}>
                            <Icon className={cn(
                                "h-6 w-6 transition-transform"
                            )} />
                        </div>
                        {!isCreateButton && <span className="text-[10px] font-medium">{item.label}</span>}
                    </div>
                  </Link>
                );
            })}
             <button
                onClick={onSearchClick}
                className={'flex h-full flex-1 flex-col items-center justify-center transition-colors text-muted-foreground hover:text-primary'}
            >
                <div className="relative flex flex-col items-center justify-center gap-1 transition-all duration-200">
                    <div className={cn("flex items-center justify-center h-12 w-12 rounded-full transition-all duration-300")}>
                        <Compass className="h-6 w-6" />
                    </div>
                    <span className="text-[10px] font-medium">Keşfet</span>
                </div>
            </button>
        </nav>
    </div>
  );
}
