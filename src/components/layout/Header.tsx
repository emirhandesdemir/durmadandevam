// src/components/layout/Header.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Send, Bell, Search, Compass, Map, LogOut, Settings, Store, Crown, UserPlus, LogOutIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import UserSearchDialog from "../search/UserSearchDialog";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "../ui/avatar";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";


interface HeaderProps {}

export default function Header({}: HeaderProps) {
    const { themeSettings, userData, totalUnreadDms, handleLogout } = useAuth();
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const { t } = useTranslation();
    const router = useRouter();

    const appName = themeSettings?.appName || 'HiweWalk';
    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    const handleNavigate = (path: string) => {
      router.push(path);
    };

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
                                <DropdownMenuItem onSelect={() => handleNavigate('/nearby')}>
                                    <Map className="mr-2 h-4 w-4"/>Yakınımdakiler
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

                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full">
                                    <Avatar className="h-7 w-7">
                                        <AvatarImage src={userData?.photoURL || undefined} />
                                        <AvatarFallback>{userData?.username?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="sr-only">Ana Menü</span>
                                </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent align="end">
                                <DropdownMenuLabel>{userData?.username}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isPremium && (
                                     <DropdownMenuItem onSelect={() => handleNavigate('/premium')}>
                                        <Crown className="mr-2 h-4 w-4 text-yellow-500" />
                                        <span>{t('premium_status')}</span>
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onSelect={() => handleNavigate('/store')}>
                                    <Store className="mr-2 h-4 w-4" />
                                    <span>{t('store')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleNavigate('/profile')}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    <span>{t('settings')}</span>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem onSelect={() => router.push('/login?addNew=true')}>
                                    <UserPlus className="mr-2 h-4 w-4" />
                                    <span>Başka Hesap Ekle</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                                    <LogOutIcon className="mr-2 h-4 w-4" />
                                    <span>{t('logout')}</span>
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
