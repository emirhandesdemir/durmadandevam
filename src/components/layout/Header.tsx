// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Send, Bell, MoreVertical } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserSearchDialog from "../search/UserSearchDialog";

interface HeaderProps {
    onMenuOpen: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
    const { themeSettings, userData, totalUnreadDms } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const pathname = usePathname();

    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    
    // Show side menu button ONLY on the main profile settings page
    const showSideMenuButton = pathname === '/profile';

    return (
        <>
            <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <Link href="/home" className="flex items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 100 100" className="h-8 w-8">
                             <defs>
                                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))' }} />
                                    <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.7 }} />
                                </linearGradient>
                            </defs>
                            <rect width="100" height="100" rx="20" fill="url(#logoGradient)"/>
                            <text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" fontSize="60" fontWeight="800" fill="hsl(var(--primary-foreground))" fontFamily="Poppins, sans-serif" letterSpacing="-5">HW</text>
                        </svg>
                        <span className="text-xl font-bold tracking-tight">{appName}</span>
                    </Link>
                    
                    <div className="flex items-center gap-1">
                        {showSideMenuButton ? (
                             <Button variant="ghost" size="icon" className="rounded-full" onClick={onMenuOpen}>
                                <MoreVertical className="h-6 w-6" />
                                <span className="sr-only">Menüyü Aç</span>
                            </Button>
                        ) : (
                            <>
                                <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSearchOpen(true)}>
                                    <Search className="h-5 w-5" />
                                    <span className="sr-only">Kullanıcı Ara</span>
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full" asChild>
                                    <Link href="/dm">
                                        <div className="relative">
                                            <Send className="h-5 w-5" />
                                            {totalUnreadDms > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span></span>}
                                        </div>
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full" asChild>
                                    <Link href="/notifications">
                                        <div className="relative">
                                            <Bell className="h-5 w-5" />
                                            {hasUnreadNotifications && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span></span>}
                                        </div>
                                    </Link>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </header>
            <UserSearchDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </>
    );
}
