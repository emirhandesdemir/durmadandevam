"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export default function BottomNav() {
    const pathname = usePathname();
    const { user, featureFlags, userData } = useAuth();
    
    // Alt navigasyon öğeleri
    const navItems = [
        { href: "/home", label: "Anasayfa", icon: Home, featureFlag: 'postFeedEnabled' },
        { href: "/rooms", label: "Odalar", icon: MessageSquare },
        { href: `/profile/${user?.uid}`, label: "Profil", icon: User },
    ];
    
    // Oda detay sayfasındaysak alt barı gizle
    if (pathname.startsWith('/rooms/') && pathname.split('/').length > 2) {
        return null;
    }
    
    // Giriş yapılmamışsa alt barı gösterme
    if (!user) {
        return null;
    }
    
    const enabledNavItems = navItems.filter(item => {
        if (item.href.endsWith('/undefined')) return false; // UID yüklenmemişse Profil'i gösterme
        if (item.featureFlag) {
            return featureFlags?.[item.featureFlag as keyof typeof featureFlags] !== false;
        }
        return true;
    });

    return (
        <footer className="border-t bg-card/80 backdrop-blur-sm shrink-0">
            <nav className={`grid h-16 grid-cols-${enabledNavItems.length}`}>
                {enabledNavItems.map((item) => {
                    // /profile/[uid] rotası için özel kontrol
                    const isActive = item.href.startsWith('/profile/') ? pathname.startsWith('/profile/') : pathname === item.href;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-sm font-medium text-muted-foreground transition-all duration-200",
                                isActive ? "text-primary scale-105" : "hover:text-primary"
                            )}>
                            <div className={cn("p-3 rounded-full transition-colors", isActive ? "bg-primary/10" : "")}>
                                <item.icon className="h-6 w-6"/>
                            </div>
                            <span className="text-xs">{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}
