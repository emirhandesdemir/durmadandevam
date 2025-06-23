"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/home", label: "Odalar", icon: Home },
    { href: "/create-room", label: "Oluştur", icon: PlusCircle },
    { href: "/profile", label: "Profil", icon: User },
]

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
            <nav className="grid h-16 grid-cols-3">
                {navItems.map((item) => {
                    const isHomeActive = item.href === "/home" && (pathname === "/home" || pathname.startsWith("/rooms"));
                    const isOtherActive = item.href !== "/home" && pathname.startsWith(item.href);
                    const isActive = isHomeActive || isOtherActive;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary",
                                isActive && "text-primary"
                            )}>
                            <item.icon className="h-6 w-6"/>
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}
