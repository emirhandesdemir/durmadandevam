// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, Search, Send, Bell, MoreVertical } from "lucide-react";
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
    
    // Sadece profil sayfasındayken sağdan açılır menüyü göster
    const showSideMenuButton = pathname.startsWith('/profile');

    return (
        <>
            <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <Link href="/home" className="flex items-center gap-2">
                        <svg className="h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M12 20h4"/><path d="M12 4H8"/><path d="M20 12h-8"/></svg>
                        <span className="text-xl font-bold tracking-tight hidden sm:inline">{appName}</span>
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
