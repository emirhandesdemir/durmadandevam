// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, PlusCircle, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";

export default function Header() {
    const { user, userData, featureFlags } = useAuth();
    const pathname = usePathname();

    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;
    const hasUnreadNotifications = userData?.hasUnreadNotifications || false;
    
    // Alt navigasyon çubuğunun gösterilip gösterilmeyeceğini belirle
    const showBottomNav = !pathname.startsWith('/rooms/') || pathname === '/rooms';


    return (
        <header className="w-full border-b bg-background">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/home" className="flex items-center gap-2 ml-2">
                    <span className={cn(
                        "text-xl font-bold tracking-tight bg-clip-text text-transparent",
                        "bg-gradient-to-r from-fuchsia-500 via-red-500 to-amber-500",
                        "animate-rainbow-text"
                    )}>
                        HiweWalk
                    </span>
                </Link>
                <div className="flex items-center gap-1">
                    {postFeedEnabled && (
                        <Button asChild variant="ghost" size="icon" className="rounded-full">
                            <Link href="/create-post">
                                <PlusCircle className="h-6 w-6" />
                                <span className="sr-only">Yeni Gönderi</span>
                            </Link>
                        </Button>
                    )}
                    <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <Link href="/notifications" className="relative">
                            <Bell className="h-5 w-5" />
                            {hasUnreadNotifications && (
                                <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive"></span>
                                </span>
                            )}
                            <span className="sr-only">Bildirimler</span>
                        </Link>
                    </Button>
                     <Button asChild variant="ghost" size="icon" className="rounded-full">
                        <Link href="/dm">
                            <Send className="h-5 w-5" />
                            <span className="sr-only">Mesajlar</span>
                        </Link>
                    </Button>
                     {!showBottomNav && user && (
                          <Link href={`/profile/${user.uid}`}>
                            <Avatar className="h-8 w-8 ml-2">
                                <AvatarImage src={user.photoURL || undefined} />
                                <AvatarFallback className="text-xs bg-muted">{user.displayName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                          </Link>
                     )}
                </div>
            </div>
        </header>
    );
}
