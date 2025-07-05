// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
    onMenuOpen: () => void;
}

export default function Header({ onMenuOpen }: HeaderProps) {
    const { themeSettings } = useAuth();

    const appName = themeSettings?.appName || 'HiweWalk';
    const appLogoUrl = themeSettings?.appLogoUrl;

    return (
        <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/home" className="flex items-center gap-3">
                    {appLogoUrl ? (
                        <img src={appLogoUrl} alt={`${appName} Logo`} className="h-8 w-auto" />
                    ) : (
                        <svg className="h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="M12 20h4"/><path d="M12 4H8"/><path d="M20 12h-8"/></svg>
                    )}
                    <span className="text-xl font-bold tracking-tight">{appName}</span>
                </Link>
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onMenuOpen}>
                        <Menu className="h-6 w-6" />
                        <span className="sr-only">Menüyü Aç</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
