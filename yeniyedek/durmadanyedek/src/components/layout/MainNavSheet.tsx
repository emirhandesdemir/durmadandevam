
'use client';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Settings, Store, Crown } from "lucide-react";
import Link from "next/link";
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
    const { userData, handleLogout } = useAuth();
    const { t } = useTranslation();
    
    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    if (!userData) return null;

    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent side="right" className="flex flex-col p-0 pt-4 w-full max-w-xs sm:max-w-sm">
                 <SheetHeader className="p-4 pt-0">
                    <SheetTitle className="sr-only">Ana Menü</SheetTitle>
                    <SheetDescription className="sr-only">Uygulama mağazası, ayarlar ve diğer seçenekler.</SheetDescription>
                </SheetHeader>
                <nav className="flex-1 space-y-2 p-4 pt-0">
                    {isPremium && (
                        <NavLink href="/premium" onOpenChange={onOpenChange}>
                            <Crown className="h-5 w-5 text-yellow-500" />
                            {t('premium_status')}
                        </NavLink>
                    )}
                    <NavLink href="/store" onOpenChange={onOpenChange}>
                        <Store className="h-5 w-5 text-muted-foreground" /> 
                        {t('store')}
                    </NavLink>
                    <NavLink href="/profile" onOpenChange={onOpenChange}>
                        <Settings className="h-5 w-5 text-muted-foreground" /> 
                        {t('settings')}
                    </NavLink>
                </nav>
                <div className="p-4 border-t">
                    <Button variant="ghost" className="w-full justify-start gap-4 p-6 text-lg" onClick={handleLogout}>
                        <LogOut className="h-5 w-5 text-muted-foreground" /> {t('logout')}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    )
}
