// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X, Camera, ShieldAlert, Trash2, Sliders, Wallet, HelpCircle, EyeOff, Bookmark, History, Bell, Globe, ChevronRight, Lock, KeyRound, Store, Server } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect, useMemo, useCallback } from "react";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { AnimatePresence, motion } from "framer-motion";
import Link from 'next/link';
import { updateUserProfile } from "@/lib/actions/userActions";
import { sendPasswordResetEmail } from "firebase/auth";
import DeleteAccountDialog from './DeleteAccountDialog';
import { Gem, BadgeCheck } from 'lucide-react';
import { useRouter } from "next/navigation";


const SettingsLink = ({ href, icon: Icon, title, value, onClick }: { href?: string, icon: React.ElementType, title: string, value?: string, onClick?: () => void }) => {
    const content = (
         <div className="flex items-center justify-between w-full p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
                <Icon className="h-6 w-6 text-muted-foreground" />
                <span className="font-medium">{title}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
                {value && <span className="text-sm">{value}</span>}
                <ChevronRight className="h-5 w-5" />
            </div>
        </div>
    );

    if (href) {
        return <Link href={href}>{content}</Link>;
    }
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
};

const SettingsHeader = ({ title }: { title: string }) => (
    <h2 className="px-4 pt-6 pb-2 text-lg font-bold text-primary">{title}</h2>
);


export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout, refreshUserData } = useAuth();
    const { toast } = useToast();
    const router = useRouter();

    const [isSaving, setIsSaving] = useState(false);
    const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    const handleSaveChanges = useCallback(async () => {
        if (!user) return;
        setIsSaving(true);
        // This is a placeholder for a more complex save logic if needed in the future
        try {
            await refreshUserData(); 
            toast({ title: "Başarılı!", description: "Profiliniz başarıyla güncellendi." });
        } catch (error: any) {
            toast({ title: "Hata", description: error.message || "Profil güncellenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    }, [user, refreshUserData, toast]);

    if (loading || !user || !userData) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <>
            <div className="space-y-2 pb-24">
                <div className="border-b">
                    <SettingsHeader title="Hesap" />
                    {userData.role === 'admin' && (
                       <SettingsLink href="/admin/dashboard" icon={Shield} title="Yönetim Paneli" />
                    )}
                    <SettingsLink href="/profile/edit" icon={UserIcon} title="Profili Düzenle" />
                    {isPremium && (
                        <SettingsLink href="/premium" icon={Crown} title="Premium Durumu" />
                    )}
                    <SettingsLink href="/store" icon={Store} title="Mağaza" />
                    <SettingsLink href="/profile/saved" icon={Bookmark} title="Kaydedilenler" />
                    <SettingsLink href="/wallet" icon={Wallet} title="Cüzdanım" />
                </div>
                
                 <div className="border-b">
                    <SettingsHeader title="Gizlilik ve Güvenlik" />
                    <SettingsLink href="/profile/privacy" icon={Lock} title="Hesap Gizliliği" value={userData.privateProfile ? 'Gizli' : 'Herkese Açık'}/>
                    <SettingsLink href="/profile/security" icon={KeyRound} title="E-posta & Şifre" />
                </div>

                 <div className="border-b">
                    <SettingsHeader title="Görünüm" />
                    <SettingsLink href="/profile/appearance" icon={Palette} title="Görünüm Ayarları" />
                </div>
                
                <div className="border-b">
                    <SettingsHeader title="İçerik Tercihleri" />
                    <SettingsLink href="/profile/hidden-content" icon={EyeOff} title="Gizlenen İçerikler" />
                </div>

                <div className="border-b">
                    <SettingsHeader title="Diğer" />
                     <SettingsLink href="/guide" icon={HelpCircle} title="Uygulama Kılavuzu" />
                     <SettingsLink onClick={() => setIsDeleteAccountOpen(true)} icon={Trash2} title="Hesabı Sil" />
                     <SettingsLink onClick={() => handleLogout(false)} icon={LogOut} title="Çıkış Yap" />
                </div>

            </div>
            
             <DeleteAccountDialog
                isOpen={isDeleteAccountOpen}
                onOpenChange={setIsDeleteAccountOpen}
            />
        </>
    );
}
