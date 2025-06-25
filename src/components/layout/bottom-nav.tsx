"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/home", label: "Anasayfa", icon: Home },
    { href: "/rooms", label: "Odalar", icon: MessageSquare },
    { href: "/create-room", label: "Oluştur", icon: PlusCircle },
    { href: "/profile", label: "Profil", icon: User },
]

export default function BottomNav() {
    const pathname = usePathname();

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/80 backdrop-blur-sm">
            <nav className="grid h-20 grid-cols-4">
                {navItems.map((item) => {
                    const isHomeActive = item.href === "/home" && (pathname === "/home");
                    const isRoomsActive = item.href === "/rooms" && (pathname === "/rooms" || pathname.startsWith("/rooms/"));
                    const isOtherActive = item.href !== "/home" && item.href !== "/rooms" && pathname.startsWith(item.href);
                    const isActive = isHomeActive || isRoomsActive || isOtherActive;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-all duration-300",
                                isActive ? "text-primary scale-110" : "hover:text-primary"
                            )}>
                            <div className={cn("p-2 rounded-full transition-all", isActive ? "bg-primary/10" : "")}>
                                <item.icon className="h-6 w-6"/>
                            </div>
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </footer>
    )
}
