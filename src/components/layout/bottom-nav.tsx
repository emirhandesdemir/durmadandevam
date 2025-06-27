"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/home", label: "Anasayfa", icon: Home },
    { href: "/rooms", label: "Odalar", icon: MessageSquare },
    { href: "/profile", label: "Profil", icon: User },
]

export default function BottomNav() {
    const pathname = usePathname();

    // Oda detay sayfasında (örn: /rooms/abc-123) alt barı gizle
    if (pathname.startsWith('/rooms/') && pathname.split('/').length > 2) {
        return null;
    }

    return (
        // The component is no longer 'fixed'. It's positioned by the parent flex container.
        <footer className="border-t bg-card/80 backdrop-blur-sm shrink-0">
            <nav className="grid h-16 grid-cols-3">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-all duration-200",
                                isActive ? "text-primary scale-105" : "hover:text-primary"
                            )}>
                            <div className={cn("p-2 rounded-full transition-colors", isActive ? "bg-primary/10" : "")}>
                                <item.icon className="h-5 w-5"/>
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}
