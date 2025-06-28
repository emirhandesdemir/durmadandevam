// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Users, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

/**
 * Ana uygulama için üst navigasyon çubuğu (Header).
 * Logo, uygulama adı, mesajlar ve bildirimler butonu içerir.
 */
export default function Header() {
    const { userData } = useAuth();
    const router = useRouter();

    const hasUnreadNotifications = userData?.hasUnreadNotifications;

    return (
        <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/home" className="flex items-center gap-3">
                    <Users className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold tracking-tight">HiweWalk</span>
                </Link>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => router.push('/dm')}>
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Mesajlar</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => router.push('/notifications')}>
                        <Bell className="h-5 w-5" />
                        {hasUnreadNotifications && (
                            <span className="absolute top-2 right-2.5 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                            </span>
                        )}
                        <span className="sr-only">Bildirimler</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}