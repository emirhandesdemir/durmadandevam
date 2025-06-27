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
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                         <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
                        HiweWalk
                    </span>
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
