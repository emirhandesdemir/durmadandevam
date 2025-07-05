
'use client';
import { Sheet, SheetContent, SheetHeader } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Bell, Gem, LogOut, Search, Send, Settings, Store, Crown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import UserSearchDialog from "../search/UserSearchDialog";
import { useTranslation } from "react-i18next";

interface MainNavSheetProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const NavLink = ({ href, onOpenChange, children }: { href: string, onOpenChange: (open: boolean) => void, children: React.ReactNode }) => (
    <Link href={href} onClick={() => onOpenChange(false)} className="flex items-center gap-4 rounded-lg p-3 text-lg font-medium text-foreground transition-colors hover:bg-muted">
        {children}
    </Link>
)

export default function MainNavSheet({ isOpen, onOpenChange }: MainNavSheetProps) {
    const { user, userData, handleLogout, totalUnreadDms } = useAuth();
    const { t } = useTranslation();
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const hasUnreadNotifications = userData?.hasUnreadNotifications;
    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    if (!user || !userData) return null;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onOpenChange}>
                <SheetContent side="left" className="flex flex-col p-0">
                    <SheetHeader className="p-4 border-b">
                        <Link href={`/profile/${user.uid}`} onClick={() => onOpenChange(false)} className="flex items-center gap-3">
                            <div className={cn("avatar-frame-wrapper", userData.selectedAvatarFrame)}>
                                <Avatar className="h-12 w-12 border-2 border-primary relative z-[1]">
                                    <AvatarImage src={userData.photoURL || undefined} />
                                    <AvatarFallback>{userData.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div>
                                <p className="font-bold">{userData.username}</p>
                                <div className="flex items-center gap-1.5 text-sm text-cyan-500 font-semibold">
                                    <Gem className="h-4 w-4" />
                                    <span>{userData.diamonds || 0}</span>
                                </div>
                            </div>
                        </Link>
                    </SheetHeader>
                    <nav className="flex-1 space-y-2 p-4">
                        <Button variant="outline" className="w-full justify-start gap-4 p-6 text-lg" onClick={() => { onOpenChange(false); setIsSearchOpen(true); }}>
                           <Search className="h-5 w-5 text-muted-foreground" /> {t('search_user')}
                        </Button>
                        <Separator />
                        {isPremium && (
                            <NavLink href="/premium" onOpenChange={onOpenChange}>
                                <div className="relative">
                                     <Crown className="h-5 w-5 text-yellow-500" />
                                </div>
                                {t('premium_status')}
                            </NavLink>
                        )}
                        <NavLink href="/store" onOpenChange={onOpenChange}><Store className="h-5 w-5 text-muted-foreground" /> {t('store')}</NavLink>
                        <NavLink href="/dm" onOpenChange={onOpenChange}>
                            <div className="relative">
                                <Send className="h-5 w-5 text-muted-foreground" />
                                {totalUnreadDms > 0 && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
                            </div>
                            {t('messages')}
                        </NavLink>
                         <NavLink href="/notifications" onOpenChange={onOpenChange}>
                            <div className="relative">
                                <Bell className="h-5 w-5 text-muted-foreground" />
                                 {hasUnreadNotifications && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span></span>}
                            </div>
                             {t('notifications')}
                        </NavLink>
                         <NavLink href="/profile" onOpenChange={onOpenChange}>
                            <Settings className="h-5 w-5 text-muted-foreground" /> {t('settings')}
                        </NavLink>
                    </nav>
                    <div className="p-4 border-t">
                        <Button variant="ghost" className="w-full justify-start gap-4 p-6 text-lg" onClick={handleLogout}>
                            <LogOut className="h-5 w-5 text-muted-foreground" /> {t('logout')}
                        </Button>
                    </div>
                </SheetContent>
            </Sheet>
            <UserSearchDialog isOpen={isSearchOpen} onOpenChange={setIsSearchOpen} />
        </>
    )
}
