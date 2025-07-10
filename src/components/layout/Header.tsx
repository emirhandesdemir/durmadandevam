// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Bell, Search } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { auth } from "@/lib/firebase";

interface HeaderProps {
    onSearchClick: () => void;
}

export default function Header({ onSearchClick }: HeaderProps) {
    const { themeSettings, userData, totalUnreadDms } = useAuth();
    
    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    
    return (
        <header className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
                <Link href="/home" className="flex items-center gap-2">
                    <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={32} height={32} className="h-8 w-8" />
                    <span className="text-xl font-bold tracking-tight">{appName}</span>
                </Link>
                
                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onSearchClick}>
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
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={userData?.photoURL || ''} />
                                    <AvatarFallback>{userData?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>{userData?.username}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {userData && (
                                <DropdownMenuItem asChild>
                                    <Link href={`/profile/${userData.uid}`}>
                                        Profilim
                                    </Link>
                                </DropdownMenuItem>
                            )}
                             <DropdownMenuItem asChild>
                                <Link href="/store">
                                    Mağaza
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/profile">
                                    Ayarlar
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             <DropdownMenuItem onClick={() => auth.signOut()} className="text-destructive focus:text-destructive">
                                Çıkış Yap
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
