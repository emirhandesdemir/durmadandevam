// src/components/layout/bottom-nav.tsx
"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

// Dummy icon to satisfy type checker for profile item
const UserIcon = () => null;

export default function BottomNav() {
    const pathname = usePathname();
    const { user, featureFlags, userData } = useAuth();
    
    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;

    // Navigasyon elemanları tanımlandı (Ekle butonu kaldırıldı)
    const navItems = [
        { href: "/home", label: "Anasayfa", icon: Home, featureFlag: postFeedEnabled },
        { href: "/rooms", label: "Odalar", icon: MessageSquare, featureFlag: true },
        { href: `/profile/${user?.uid}`, label: "Profil", icon: UserIcon, featureFlag: true },
    ];
    
    // Belirli alt sayfalarda navigasyonu gizle
    if ((pathname.startsWith('/rooms/') || pathname.startsWith('/dm/')) && pathname.split('/').length > 2) {
        return null;
    }
    
    if (!user) {
        return null;
    }
    
    const enabledNavItems = navItems.filter(item => item.featureFlag);

    return (
        // Kenardan boşluklu, havada duran bir görünüm için değiştirildi
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center pointer-events-none">
            <div className="bg-background/80 backdrop-blur-md p-2 rounded-full border shadow-lg pointer-events-auto">
                <nav className="flex items-center justify-around gap-2">
                    {enabledNavItems.map((item) => {
                        const isProfile = item.href.startsWith('/profile/');
                        const isActive = isProfile ? pathname.startsWith('/profile/') : pathname === item.href;
                        
                        if (item.href.endsWith('/undefined')) return null;

                        return (
                            <Link 
                                href={item.href} 
                                key={item.label}
                                className={cn(
                                    "flex flex-col h-14 w-16 items-center justify-center rounded-xl text-muted-foreground transition-all duration-300",
                                    isActive 
                                        ? "text-primary" 
                                        : "hover:text-foreground"
                                )}>
                                {isProfile ? (
                                    <div className="relative">
                                         <div className={cn("avatar-frame-wrapper", userData?.selectedAvatarFrame)}>
                                            <Avatar className="relative z-[1] h-7 w-7">
                                                <AvatarImage src={user.photoURL || undefined} />
                                                <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>
                                ) : (
                                    <item.icon className="h-6 w-6"/>
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
