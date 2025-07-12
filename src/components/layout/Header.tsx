// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Bell, Search, Compass, Map } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import UserSearchDialog from "../search/UserSearchDialog";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import MainNavSheet from "./MainNavSheet";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";


interface HeaderProps {}

export default function Header({}: HeaderProps) {
    const { themeSettings, userData, totalUnreadDms } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    
    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    
    return (
        <>
            <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-14 items-center justify-between">
                    <Link href="/home" className="flex items-center gap-2">
                        <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={32} height={32} className="h-8 w-8" />
                        <span className="text-xl font-bold tracking-tight">{appName}</span>
                    </Link>
                    
                    <div className="flex items-center gap-1">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Compass className="h-5 w-5" />
                                    <span className="sr-only">Keşfet</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                    <Link href="/nearby"><Map className="mr-2 h-4 w-4"/>Yakınımdakiler</Link>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>

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
                        <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setIsSheetOpen(true)}>
                            <Avatar className="h-7 w-7">
                                <AvatarImage src={userData?.photoURL || undefined} />
                                <AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="sr-only">Ana Menü</span>
                        </Button>
                    </div>
                </div>
            </header>
            <UserSearchDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
            <MainNavSheet isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
        </>
    );
}
