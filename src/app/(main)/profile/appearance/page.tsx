// src/app/(main)/profile/appearance/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X, Camera, ShieldAlert, Trash2, Sliders, Wallet, HelpCircle, EyeOff, Bookmark, History, Bell, Globe, ChevronRight, Lock, KeyRound, Store } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useMemo, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
import { AnimatePresence, motion } from "framer-motion";
import Link from 'next/link';
import { updateUserProfile } from "@/lib/actions/userActions";
import { sendEmailVerification, sendPasswordResetEmail, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from "firebase/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deleteUserAccount } from "@/lib/actions/userActions";
import { Gem, BadgeCheck } from 'lucide-react';
import { useRouter } from "next/navigation";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { bubbleStyles } from "@/lib/bubbles";
import { avatarFrames } from "@/lib/frames";
import AvatarWithFrame from "@/components/common/AvatarWithFrame";

const AppearanceSettingsPage = () => {
    const { userData, loading, refreshUserData } = useAuth();
    const { theme, setTheme } = useTheme();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Local state for optimistic UI updates
    const [animatedNav, setAnimatedNav] = useState(userData?.animatedNav ?? true);
    const [selectedBubble, setSelectedBubble] = useState(userData?.selectedBubble || 'none');
    const [selectedFrame, setSelectedFrame] = useState(userData?.selectedAvatarFrame || 'none');


    useEffect(() => {
        if (userData) {
            setAnimatedNav(userData.animatedNav ?? true);
            setSelectedBubble(userData.selectedBubble || 'none');
            setSelectedFrame(userData.selectedAvatarFrame || 'none');
        }
    }, [userData]);

    const handleSave = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            await updateUserProfile({
                userId: userData.uid,
                animatedNav,
                selectedBubble,
                selectedAvatarFrame: selectedFrame,
            });
            await refreshUserData();
            toast({ description: "Görünüm ayarlarınız kaydedildi." });
        } catch (e: any) {
            toast({ variant: 'destructive', description: "Ayarlar kaydedilemedi." });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !userData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    const isPremium = userData.premiumUntil && userData.premiumUntil.toDate() > new Date();

    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile"><ChevronRight className="transform rotate-180 mr-2 h-4 w-4"/> Geri</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kaydet
                </Button>
            </header>
            <div className="p-4 space-y-8">
                {/* Theme Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Uygulama Teması</CardTitle>
                        <CardDescription>Uygulama genelinde kullanılacak renk modunu seçin.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                             <Label htmlFor="light-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="light" id="light-theme" className="sr-only" /><Sun className="mb-3 h-8 w-8" /><span className="font-bold">Aydınlık</span></Label>
                            <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="dark" id="dark-theme" className="sr-only" /><Moon className="mb-3 h-8 w-8" /><span className="font-bold">Karanlık</span></Label>
                            <Label htmlFor="system-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"><RadioGroupItem value="system" id="system-theme" className="sr-only" /><Laptop className="mb-3 h-8 w-8" /><span className="font-bold">Sistem</span></Label>
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Avatar Frame Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Avatar Çerçevesi</CardTitle>
                        <CardDescription>Profil resminiz için bir çerçeve seçin.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-6">
                        <AvatarWithFrame photoURL={userData.photoURL} selectedAvatarFrame={selectedFrame} className="h-24 w-24" fallback={userData.username.charAt(0)} />
                        <div className="grid grid-cols-3 md:grid-cols-4 gap-3 w-full">
                            {avatarFrames.map(frame => {
                                const isSelected = selectedFrame === frame.id;
                                const isDisabled = frame.premiumOnly && !isPremium;
                                return (
                                    <button key={frame.id} onClick={() => !isDisabled && setSelectedFrame(frame.id)} disabled={isDisabled} className={cn("p-2 border-2 rounded-lg flex flex-col items-center gap-2 cursor-pointer transition-all", isSelected ? 'border-primary bg-primary/10' : 'border-muted hover:border-foreground/50', isDisabled && 'opacity-50 cursor-not-allowed')}>
                                        <p className="text-xs font-semibold">{frame.name}</p>
                                        {isDisabled && <span className="text-[10px] text-amber-500 font-bold">Premium</span>}
                                    </button>
                                )
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Bubble Selection */}
                <Card>
                    <CardHeader>
                         <CardTitle>Sohbet Balonu Stili</CardTitle>
                        <CardDescription>Sohbet odalarında mesajlarınızın nasıl görüneceğini seçin.</CardDescription>
                    </CardHeader>
                     <CardContent>
                        <div className="relative p-4 rounded-lg bg-primary text-primary-foreground">
                            <p>Bu bir önizleme mesajıdır.</p>
                            <div className={cn("bubble-wrapper", selectedBubble)}>
                                {Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}
                            </div>
                        </div>
                        <RadioGroup value={selectedBubble} onValueChange={setSelectedBubble} className="grid grid-cols-3 md:grid-cols-4 gap-2 mt-4">
                            {bubbleStyles.map(style => (
                                <Label key={style.id} htmlFor={style.id} className={cn("flex items-center justify-center p-2 border rounded-lg cursor-pointer", selectedBubble === style.id ? 'border-primary' : 'border-muted')}>
                                    <RadioGroupItem value={style.id} id={style.id} className="sr-only"/>
                                    <div className="flex flex-col items-center gap-1">
                                        <div className={cn("h-6 w-10 rounded-md relative overflow-hidden", style.id)}>
                                            {Array.from({ length: 3 }).map((_, i) => <div key={i} className={cn("bubble absolute h-2 w-2", i === 0 && 'top-1 left-1', i === 1 && 'top-3 right-1', i === 2 && 'bottom-1 left-2')} />)}
                                        </div>
                                        <span className="text-xs font-medium">{style.name}</span>
                                    </div>
                                </Label>
                            ))}
                        </RadioGroup>
                    </CardContent>
                </Card>

                {/* Other Settings */}
                 <Card>
                    <CardHeader><CardTitle>Diğer Ayarlar</CardTitle></CardHeader>
                    <CardContent>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="animated-nav">Animasyonlu Navigasyon</Label>
                                <p className="text-xs text-muted-foreground">Sayfa kaydırıldığında üst ve alt bar gizlensin.</p>
                            </div>
                            <Switch id="animated-nav" checked={animatedNav} onCheckedChange={setAnimatedNav} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default AppearanceSettingsPage;
