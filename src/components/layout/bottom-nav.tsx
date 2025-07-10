// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessageCircle, Plus, Compass, Clapperboard } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { motion } from 'framer-motion';

interface BottomNavProps {
  onExploreClick: () => void;
  isExploreMenuOpen: boolean;
}

export default function BottomNav({ onExploreClick, isExploreMenuOpen }: BottomNavProps) {
  const pathname = usePathname();
  const { user, userData } = useAuth();
  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa' },
        { id: 'rooms', href: '/rooms', icon: MessageCircle, label: 'Odalar' },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'explore', icon: Compass, label: 'Keşfet' },
        { id: 'surf', href: '/surf', icon: Clapperboard, label: 'Surf' },
      ]
  }, [user]);

  if (!user) {
    return null;
  }
  
  if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || (pathname.startsWith('/call/'))) {
    return null;
  }
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
        <nav className="mx-auto flex h-16 max-w-md items-center justify-around">
            {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === 'explore' ? isExploreMenuOpen : (item.href ? pathname.startsWith(item.href) : false);
                
                const buttonActiveStyle = isActive;

                const buttonContent = (
                     <div className={cn(
                        "relative flex flex-col items-center justify-center gap-1 transition-all duration-200"
                     )}>
                        <div className={cn(
                            "flex items-center justify-center h-8 w-12 rounded-full transition-all duration-300", 
                            buttonActiveStyle && item.id !== 'create' ? 'bg-primary/10' : ''
                        )}>
                            <Icon className={cn(
                                "h-6 w-6 transition-transform", 
                                item.id === 'create' && 'text-primary'
                            )} />
                        </div>
                        <span className="text-[10px] font-medium">{item.label}</span>
                    </div>
                );

                if (item.href) {
                     return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          'flex h-full flex-1 flex-col items-center justify-center transition-colors',
                          buttonActiveStyle ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                        )}
                      >
                        {buttonContent}
                      </Link>
                    );
                }
                
                return (
                    <button
                        key={item.id}
                        onClick={onExploreClick}
                        className={cn(
                        'flex h-full flex-1 flex-col items-center justify-center transition-colors',
                        buttonActiveStyle ? 'text-primary' : 'text-muted-foreground hover:text-primary',
                        )}
                    >
                        {buttonContent}
                    </button>
                )
            })}
        </nav>
    </div>
  );
}
