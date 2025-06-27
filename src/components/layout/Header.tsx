// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Users } from "lucide-react";

/**
 * Ana uygulama için üst navigasyon çubuğu (Header).
 * Logo, uygulama adı ve mesajlar (DM) butonu içerir.
 */
export default function Header() {
    return (
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-16 items-center justify-between">
                <Link href="/home" className="flex items-center gap-2">
                    <Users className="h-7 w-7 text-primary" />
                    <span className="text-xl font-bold tracking-tight">HiweWalk</span>
                </Link>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <Send className="h-5 w-5" />
                        <span className="sr-only">Mesajlar</span>
                    </Button>
                </div>
            </div>
        </header>
    );
}
