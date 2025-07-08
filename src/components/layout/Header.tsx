// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, Send, Bell, Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import UserSearchDialog from "../search/UserSearchDialog";
import Image from "next/image";

interface HeaderProps {}

export default function Header({}: HeaderProps) {
    const { themeSettings, userData } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const pathname = usePathname();

    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    
    // Show store button ONLY on the main profile settings page
    const onProfileSettingsPage = pathname === '/profile';

    return (
        <>
            <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <Link href="/home" className="flex items-center gap-2">
                        <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={32} height={32} className="h-8 w-8" />
                        <span className="text-xl font-bold tracking-tight">{appName}</span>
                    </Link>
                    
                    <div className="flex items-center gap-1">
                        {onProfileSettingsPage ? (
                             <Button asChild variant="ghost">
                                <Link href="/store">
                                    <Store className="mr-2 h-5 w-5" />
                                    Mağaza
                                </Link>
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
                                        </div>
                                    </Link>
                                </Button>
                                <Button variant="ghost" size="icon" className="rounded-full" asChild>
                                    <Link href="/notifications">
                                        <div className="relative">
                                            <Bell className="h-5 w-5" />
                                            {hasUnreadNotifications && <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
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
