// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MessagesSquare, Plus, Compass, Store } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useVoiceChat } from '@/contexts/VoiceChatContext';

export default function BottomNav() {
  const pathname = usePathname();
  const { user, refreshFeed } = useAuth();
  
  const navItems = useMemo(() => {
    if (!user) return [];
    return [
        { id: 'home', href: '/home', icon: Home, label: 'Anasayfa', action: pathname === '/home' ? refreshFeed : undefined },
        { id: 'rooms', href: '/rooms', icon: MessagesSquare, label: 'Odalar' },
        { id: 'create', href: '/create', icon: Plus, label: 'Oluştur'},
        { id: 'explore', href: '/explore', icon: Compass, label: 'Keşfet'},
        { id: 'store', href: '/store', icon: Store, label: 'Mağaza' },
      ]
  }, [user, pathname, refreshFeed]);

  if (!user) {
    return null;
  }
  
  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 w-full border-t bg-background/95 backdrop-blur-sm">
          <nav className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center">
              {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.href && pathname.startsWith(item.href);
                  
                  const isCreateButton = item.id === 'create';

                  const content = (
                    <>
                       <div className={cn(
                            "flex items-center justify-center h-10 w-10 rounded-full transition-all duration-300", 
                            isCreateButton ? 'bg-primary text-primary-foreground rounded-xl h-9 w-9' : ''
                        )}>
                            <Icon className={cn("h-6 w-6 transition-transform")} />
                        </div>
                        {!isCreateButton && <span className="text-[10px] font-medium">{item.label}</span>}
                    </>
                  );

                  const commonClasses = "flex h-full flex-col items-center justify-center gap-1 transition-colors";

                  if (item.action) {
                      return (
                          <button
                            key={item.id}
                            onClick={item.action}
                            className={cn(commonClasses, isCreateButton ? '' : (isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'))}
                          >
                              {content}
                          </button>
                      )
                  }

                  if (item.href) {
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={cn(commonClasses, isCreateButton ? '' : (isActive ? 'text-primary' : 'text-muted-foreground hover:text-primary'))}
                        >
                            {content}
                        </Link>
                      );
                  }

                  return null;
              })}
          </nav>
      </div>
    </>
  );
}
