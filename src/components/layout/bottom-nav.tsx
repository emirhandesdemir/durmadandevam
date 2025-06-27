"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
    { href: "/home", label: "Anasayfa", icon: Home },
    { href: "/rooms", label: "Odalar", icon: MessageSquare },
    { href: "/create-post", label: "Gönderi Ekle", icon: PlusCircle },
    { href: "/profile", label: "Profil", icon: User },
]

export default function BottomNav() {
    const pathname = usePathname();

    // Oda detay sayfasında (örn: /rooms/abc-123) alt barı gizle
    if (pathname.startsWith('/rooms/') && pathname !== '/rooms') {
        return null;
    }

    return (
        <footer className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/80 backdrop-blur-sm">
            {/* Yükseklik h-20'den (80px) h-16'ya (64px) düşürüldü */}
            <nav className="grid h-16 grid-cols-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    
                    return (
                        <Link href={item.href} key={item.label}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-all duration-200",
                                isActive ? "text-primary scale-105" : "hover:text-primary"
                            )}>
                            <div className={cn("p-2 rounded-full transition-colors", isActive ? "bg-primary/10" : "")}>
                                 {/* İkon boyutu h-6'dan h-5'e düşürüldü */}
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
