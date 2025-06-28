"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Ellipsis, PlusCircle, Bell, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "../ui/button";

export default function BottomNav() {
    const pathname = usePathname();
    const { user, userData, featureFlags } = useAuth();
    
    const hasUnreadNotifications = userData?.hasUnreadNotifications || false;
    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;

    // Direct link items
    const navItems = [
        { href: "/home", label: "Anasayfa", icon: Home, featureFlag: 'postFeedEnabled' },
        { href: "/rooms", label: "Odalar", icon: MessageSquare },
        { href: `/profile/${user?.uid}`, label: "Profil", icon: User },
    ];
    
    // Hide nav on specific sub-pages
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
             <nav className="flex items-center justify-around gap-2 rounded-full bg-background/80 p-2 shadow-lg backdrop-blur-md border border-border/20 pointer-events-auto">
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

                {/* More Options Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-all duration-300 hover:bg-muted">
                            <Ellipsis className="h-6 w-6" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent side="top" align="end" className="mb-2 w-56">
                        {postFeedEnabled && (
                             <DropdownMenuItem asChild>
                                <Link href="/create-post">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    <span>Yeni Gönderi</span>
                                </Link>
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild>
                            <Link href="/notifications" className="relative flex items-center">
                                <Bell className="mr-2 h-4 w-4" />
                                <span>Bildirimler</span>
                                 {hasUnreadNotifications && (
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex h-2 w-2">
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                                    </span>
                                )}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                           <Link href="/dm">
                                <Send className="mr-2 h-4 w-4" />
                                <span>Mesajlar</span>
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

            </nav>
        </div>
    )
}
