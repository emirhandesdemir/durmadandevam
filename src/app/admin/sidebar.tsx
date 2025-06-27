// src/components/admin/sidebar.tsx
// Bu bileşen, admin panelinin sol tarafında yer alan dikey navigasyon menüsüdür.
// Paneldeki farklı yönetim sayfalarına (Dashboard, Kullanıcılar, Odalar vb.)
// hızlı erişim sağlar ve mobil cihazlarda gizlenip açılabilir.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  FileText,
  Puzzle,
  Palette,
  Settings,
  X,
  Swords
} from "lucide-react";
import { Button } from "../ui/button";

// Navigasyon öğeleri listesi
const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Kullanıcılar", icon: Users },
  { href: "/admin/rooms", label: "Odalar", icon: MessageSquare },
  { href: "/admin/posts", label: "Gönderiler", icon: FileText },
  { href: "/admin/questions", label: "Quiz Soruları", icon: Puzzle },
  { href: "/admin/theme", label: "Tema Ayarları", icon: Palette },
  { href: "/admin/system", label: "Sistem Ayarları", icon: Settings },
];

interface SidebarProps {
    isSidebarOpen: boolean;
    setSidebarOpen: (isOpen: boolean) => void;
}


export default function Sidebar({ isSidebarOpen, setSidebarOpen }: SidebarProps) {
  const pathname = usePathname();

  return (
    <>
        {/* Mobil için arkaplan overlay */}
        {isSidebarOpen && (
            <div 
                className="fixed inset-0 z-20 bg-black/60 transition-opacity duration-300 lg:hidden"
                onClick={() => setSidebarOpen(false)}
            ></div>
        )}

        {/* Gerçek Sidebar */}
        <aside className={cn(
            "fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r bg-background transition-transform duration-300 lg:static lg:translate-x-0",
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
            {/* Logo ve Kapatma Butonu */}
            <div className="flex h-16 items-center justify-between border-b px-4">
                <Link href="/admin/dashboard" className="flex items-center gap-2 font-bold text-lg">
                    <Swords className="h-7 w-7 text-primary" />
                    <span>Admin Paneli</span>
                </Link>
                <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                    <X className="h-5 w-5"/>
                </Button>
            </div>
            
            {/* Navigasyon Linkleri */}
            <nav className="flex-1 space-y-1 p-2">
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setSidebarOpen(false)} // Mobil menüde linke tıklanınca kapat
                        className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:bg-primary/10 hover:text-primary",
                            pathname === item.href && "bg-primary/10 font-semibold text-primary"
                        )}
                    >
                        <item.icon className="h-5 w-5" />
                        {item.label}
                    </Link>
                ))}
            </nav>
        </aside>
    </>
  );
}
