// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Users, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";

/**
 * Ana uygulama için üst navigasyon çubuğu (Header).
 * Logo, uygulama adı, mesajlar ve bildirimler butonu içerir.
 */
export default function Header() {
    const { userData, totalUnreadDms, themeSettings } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    const appName = themeSettings?.appName || 'HiweWalk';
    const appLogoUrl = themeSettings?.appLogoUrl;

    return (
        <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/home" className="flex items-center gap-3">
                    {appLogoUrl ? (
                        <img src={appLogoUrl} alt={`${appName} Logo`} className="h-8 w-auto" />
                    ) : (
                        <Users className="h-7 w-7 text-primary" />
                    )}
                    <span className="text-xl font-bold tracking-tight">{appName}</span>
                </Link>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => router.push('/dm')}>
                        <Send className="h-5 w-5" />
                        {totalUnreadDms > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                            </span>
                        )}
                        <span className="sr-only">{t('messages')}</span>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full relative" onClick={() => router.push('/notifications')}>
                        <Bell className="h-5 w-5" />
                        {hasUnreadNotifications && (
                            <span className="absolute top-1.5 right-1.5 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
                            </span>
                        )}
                        <span className="sr-only">{t('notifications')}</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
