// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Bell, Search, Settings, LogOut, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import UserSearchDialog from "../search/UserSearchDialog";
import { useState } from "react";
import AvatarWithFrame from "../common/AvatarWithFrame";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface HeaderProps {}

export default function Header({}: HeaderProps) {
    const { themeSettings, user, userData, totalUnreadDms, handleLogout } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    
    return (
        <>
            <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <Link href="/home" className="flex items-center">
                        <span className="text-xl font-bold tracking-tight">{appName}</span>
                    </Link>
                    
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSearchOpen(true)}>
                            <Search className="h-5 w-5" />
                            <span className="sr-only">Kullanıcı Ara</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" asChild>
                            <Link href="/dm">
                                <div className="relative">
                                    <Send className="h-5 w-5" />
                                    {totalUnreadDms > 0 && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span></span>}
                                </div>
                            </Link>
                        </Button>
                        <Button variant="ghost" size="icon" className="rounded-full" asChild>
                            <Link href="/notifications">
                                <div className="relative">
                                    <Bell className="h-5 w-5" />
                                    {hasUnreadNotifications && <span className="absolute -top-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-background" />}
                                </div>
                            </Link>
                        </Button>

                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="icon" className="rounded-full">
                                   <AvatarWithFrame
                                        photoURL={userData?.photoURL}
                                        selectedAvatarFrame={userData?.selectedAvatarFrame}
                                        className="h-7 w-7"
                                        fallback={userData?.username?.charAt(0).toUpperCase()}
                                        fallbackClassName="text-xs"
                                    />
                                    <span className="sr-only">Kullanıcı menüsü</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{userData?.username}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem asChild>
                                    <Link href={`/profile/${user?.uid}`}>
                                        <User className="mr-2 h-4 w-4" />
                                        <span>Profil</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                    <Link href={`/profile`}>
                                        <Settings className="mr-2 h-4 w-4" />
                                        <span>Ayarlar</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Çıkış Yap</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </header>
            <UserSearchDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </>
    );
}
