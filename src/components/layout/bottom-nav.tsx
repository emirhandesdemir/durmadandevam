"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";

export default function BottomNav() {
    const pathname = usePathname();
    const { user, featureFlags } = useAuth();
    
    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;

    // Define nav items
    const navItems = [
        { href: "/home", label: "Anasayfa", icon: Home, featureFlag: postFeedEnabled },
        { href: "/rooms", label: "Odalar", icon: MessageSquare, featureFlag: true },
        { href: `/profile/${user?.uid}`, label: "Profil", icon: UserIcon, featureFlag: true }, // Placeholder for avatar
    ];
    
    // Hide nav on specific sub-pages
    if ((pathname.startsWith('/rooms/') || pathname.startsWith('/dm/')) && pathname.split('/').length > 2) {
        return null;
    }
    
    if (!user) {
        return null;
    }
    
    const enabledNavItems = navItems.filter(item => item.featureFlag);

    return (
        <div className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
             <nav className="flex items-center justify-around gap-2 rounded-full bg-background/80 p-2 shadow-lg backdrop-blur-md border border-border/20 pointer-events-auto">
                {enabledNavItems.map((item) => {
                    const isProfile = item.href.startsWith('/profile/');
                    // A more robust check for active profile link
                    const isActive = isProfile ? pathname.startsWith('/profile/') : pathname === item.href;
                    
                    if (item.href.endsWith('/undefined')) return null;

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

// Dummy icon to satisfy type checker for profile item
const UserIcon = () => null;