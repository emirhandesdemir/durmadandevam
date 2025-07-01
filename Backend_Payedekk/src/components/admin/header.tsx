// src/components/admin/header.tsx
// Bu bileşen, admin panelinin üst kısmında yer alan başlık çubuğudur.
// Özellikle mobil cihazlarda yan menüyü (sidebar) açmak için kullanılan
// hamburger menü butonunu içerir.

"use client";

import { Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  setSidebarOpen: (isOpen: boolean) => void;
}

export default function Header({ setSidebarOpen }: HeaderProps) {
    const { user, handleLogout } = useAuth(); // handleLogout'u AuthContext'ten alıyoruz.

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-4 md:px-6 lg:justify-end">
      {/* Mobil Menü Butonu (Sadece mobil ve tabletlerde görünür) */}
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu className="h-6 w-6" />
        <span className="sr-only">Menüyü Aç</span>
      </Button>

      {/* Kullanıcı Menüsü */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="rounded-full">
            <User className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{user?.displayName || "Admin"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Profil (Yakında)</DropdownMenuItem>
          <DropdownMenuItem onClick={handleLogout}>Çıkış Yap</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
