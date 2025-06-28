"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Bell } from "lucide-react";
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
        <footer className="sticky bottom-0 z-30 border-t bg-background/95 backdrop-blur-sm shrink-0">
            <nav className={cn("grid h-14", `grid-cols-${enabledNavItems.length}`)}>
                {enabledNavItems.map((item) => {
                    const isProfile = item.href.startsWith('/profile/');
                    const isActive = isProfile ? pathname.startsWith('/profile/') : pathname === item.href;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors duration-200",
                                isActive ? "text-primary" : "hover:text-primary"
                            )}>
                            {isProfile ? (
                                <Avatar className={cn("h-6 w-6 transition-all", isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background")}>
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
        </footer>
    )
}
