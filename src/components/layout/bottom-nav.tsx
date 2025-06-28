"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export default function BottomNav() {
    const pathname = usePathname();
    const { user, featureFlags } = useAuth();
    
    // Alt navigasyon öğeleri
    const navItems = [
        { href: "/home", label: "Anasayfa", icon: Home, featureFlag: 'postFeedEnabled' },
        { href: "/rooms", label: "Odalar", icon: MessageSquare },
        { href: `/profile/${user?.uid}`, label: "Profil", icon: User },
    ];
    
    // Belirli sayfalarda alt barı gizle
    if (pathname.startsWith('/rooms/') && pathname.split('/').length > 2) {
        return null;
    }
    
    if (!user) {
        return null;
    }
    
    const enabledNavItems = navItems.filter(item => {
        if (item.href.endsWith('/undefined')) return false;
        if (item.featureFlag) {
            return featureFlags?.[item.featureFlag as keyof typeof featureFlags] !== false;
        }
        return true;
    });

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
             <nav className="flex items-center justify-around gap-4 rounded-full bg-background/80 p-2 shadow-lg backdrop-blur-md border border-border/20 pointer-events-auto">
                {enabledNavItems.map((item) => {
                    const isProfile = item.href.startsWith('/profile/');
                    const isActive = isProfile ? pathname.startsWith('/profile/') : pathname === item.href;
                    
                    return (
                        <Link 
                            href={item.href} 
                            key={item.label}
                            className={cn(
                                "flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-all duration-300",
                                isActive 
                                    ? "bg-primary text-primary-foreground scale-110 shadow-md" 
                                    : "hover:bg-muted"
                            )}>
                            {isProfile ? (
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user.photoURL || undefined} />
                                    <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ) : (
                                <item.icon className="h-6 w-6"/>
                            )}
                        </Link>
                    )
                })}
            </nav>
        </div>
    )
}
