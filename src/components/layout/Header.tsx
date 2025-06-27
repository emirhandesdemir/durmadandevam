// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Users, PlusCircle, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Ana uygulama için üst navigasyon çubuğu (Header).
 * Logo, uygulama adı ve çeşitli eylem butonları içerir.
 */
export default function Header() {
    const { featureFlags, userData } = useAuth();
    const postFeedEnabled = featureFlags?.postFeedEnabled ?? true;
    const followRequestCount = userData?.followRequests?.length || 0;

    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/home" className="flex items-center gap-2">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                         <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
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
                         <Link href="/requests" className="relative">
                            <Bell className="h-5 w-5" />
                            {followRequestCount > 0 && (
                                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground">
                                    {followRequestCount}
                                </span>
                            )}
                            <span className="sr-only">Takip İstekleri</span>
                        </Link>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Mesajlar</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
