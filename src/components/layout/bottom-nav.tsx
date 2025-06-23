"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, MessageSquare, Shuffle, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/home", label: "Akış", icon: Home },
    { href: "#", label: "Odalar", icon: Compass },
    { href: "#", label: "DM", icon: MessageSquare },
    { href: "#", label: "Eşleş", icon: Shuffle },
    { href: "#", label: "Arkadaşlar", icon: Users },
    { href: "#", label: "Profil", icon: User },
]

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
            <nav className="flex items-center justify-around h-16">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary",
                                isActive && "text-primary"
                            )}>
                            <item.icon className="h-5 w-5"/>
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}
