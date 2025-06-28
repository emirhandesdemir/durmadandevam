// src/components/layout/bottom-nav.tsx
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, PlusSquare, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export default function BottomNav() {
    const pathname = usePathname();
    const { user, featureFlags, userData } = useAuth();
    
    if (!user) {
        return null;
    }

    // Hide nav on deep room/dm pages that have their own back button
    if ((pathname.startsWith('/rooms/') && pathname !== '/rooms') || 
        (pathname.startsWith('/dm/') && pathname !== '/dm')) {
        return null;
    }

    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;

    const navItems = [
        postFeedEnabled && {
            id: 'home',
            isActive: pathname === '/home' || pathname === '/create-post',
            href: pathname === '/home' ? '/create-post' : '/home',
            icon: pathname === '/home' ? PlusSquare : Home,
            label: pathname === '/home' ? 'Oluştur' : 'Anasayfa',
        },
        {
            id: 'rooms',
            isActive: pathname === '/rooms' || pathname === '/create-room',
            href: pathname === '/rooms' ? '/create-room' : '/rooms',
            icon: pathname === '/rooms' ? PlusSquare : MessageSquare,
            label: pathname === '/rooms' ? 'Oda Oluştur' : 'Odalar',
        },
        {
            id: 'profile',
            isActive: pathname.startsWith('/profile'),
            href: pathname.startsWith(`/profile/${user.uid}`) ? '/profile' : `/profile/${user.uid}`,
            icon: pathname.startsWith('/profile') ? Settings : null, // Special case for avatar
            label: pathname.startsWith('/profile') ? 'Ayarlar' : 'Profil',
        }
    ].filter(Boolean) as any[]; // Use any to simplify; we know the structure is correct.

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-background/80 backdrop-blur-md p-2 rounded-full border shadow-lg pointer-events-auto">
                <nav className="flex items-center justify-around gap-2">
                    {navItems.map((item) => {
                        if (!item) return null;
                        
                        const Icon = item.icon;

                        if (item.href.endsWith('/undefined')) return null;

                        return (
                            <Link 
                                href={item.href} 
                                key={item.id}
                                className={cn(
                                    "flex flex-col h-14 w-16 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300",
                                    item.isActive ? "text-primary" : "hover:text-foreground"
                                )}>
                                {item.id === 'profile' && !item.isActive ? (
                                    <div className="relative">
                                         <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                                            <Avatar className="relative z-[1] h-7 w-7">
                                                <AvatarImage src={user.photoURL || undefined} />
                                                <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>
                                ) : (
                                    Icon && <Icon className="h-6 w-6"/>
                                )}
                                <span className="text-xs font-medium">{item.label}</span>
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </div>
    )
}
