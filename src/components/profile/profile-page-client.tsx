// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X, Camera, ShieldAlert, Trash2, Sliders, Wallet, BadgeCheck, Mail } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect, useMemo } from "react";
import { auth, db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { AnimatePresence, motion } from "framer-motion";
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { updateUserProfile } from "@/lib/actions/userActions";
import { Textarea } from "../ui/textarea";
import BlockedUsersDialog from "./BlockedUsersDialog";
import { sendPasswordResetEmail, sendEmailVerification } from "firebase/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { deleteUserAccount } from "@/lib/actions/userActions";
import { Gem } from "lucide-react";
import { giftLevelThresholds } from "@/lib/gifts";
import { Progress } from "@/components/ui/progress";

const bubbleOptions = [
    { id: "", name: "Yok" },
    { id: "bubble-style-1", name: "Neon" },
    { id: "bubble-style-2", name: "Okyanus" },
    { id: "bubble-style-3", name: "Gün Batımı" },
    { id: "bubble-style-4", name: "Orman" },
    { id: "bubble-style-fire", name: "Alevli" },
    { id: "bubble-style-premium", name: "Premium", isPremium: true },
];

export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    
    // Form States
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [age, setAge] = useState<number | string>("");
    const [gender, setGender] = useState<"male" | "female" | undefined>(undefined);
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [selectedBubble, setSelectedBubble] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [interests, setInterests] = useState<string[]>([]);
    const [currentInterest, setCurrentInterest] = useState("");
    const [inviteLink, setInviteLink] = useState("");
    const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [animatedNav, setAnimatedNav] = useState(true);
        
    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();
    
    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setAge(userData.age || "");
            setGender(userData.gender || undefined);
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
            setSelectedBubble(userData.selectedBubble || "");
            setInterests(userData.interests || []);
            setAnimatedNav(userData.animatedNav ?? true);
        }
        if (user) {
            const encodedRef = btoa(user.uid);
            setInviteLink(`${window.location.origin}/signup?ref=${encodedRef}`);
        }
    }, [userData, user]);
    
    const hasChanges = useMemo(() => {
        if (!userData) return false;
        const ageAsNumber = age === '' || age === undefined ? undefined : Number(age);
        const userDataAge = userData.age === undefined ? undefined : Number(userData.age);

        if (username.trim() !== (userData.username || '').trim()) return true;
        if (bio.trim() !== (userData.bio || '').trim()) return true;
        if (ageAsNumber !== userDataAge) return true;
        if (gender !== userData.gender) return true;
        if (privateProfile !== (userData.privateProfile || false)) return true;
        if (acceptsFollowRequests !== (userData.acceptsFollowRequests ?? true)) return true;
        if (showOnlineStatus !== (userData.showOnlineStatus ?? true)) return true;
        if (selectedBubble !== (userData.selectedBubble || '')) return true;
        if (JSON.stringify(interests.map(i => i.trim()).sort()) !== JSON.stringify((userData.interests || []).map(i => i.trim()).sort())) return true;
        if (animatedNav !== (userData.animatedNav ?? true)) return true;
    
        return false;
    }, [
        username, bio, age, gender, privateProfile, 
        acceptsFollowRequests, showOnlineStatus, selectedBubble, 
        interests, animatedNav, userData
    ]);

    const handleSaveChanges = async () => {
        if (!user || !hasChanges) return;
    
        setIsSaving(true);
        try {
            const updatesForDb: { [key: string]: any } = {};
            
            if(username.trim() !== (userData?.username || '').trim()) updatesForDb.username = username;
            if (bio !== userData?.bio) updatesForDb.bio = bio;
            if (age !== userData?.age) updatesForDb.age = Number(age) || null;
            if (gender !== userData?.gender) updatesForDb.gender = gender || null;
            if (privateProfile !== userData?.privateProfile) updatesForDb.privateProfile = privateProfile;
            if (acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) updatesForDb.acceptsFollowRequests = acceptsFollowRequests;
            if (showOnlineStatus !== (userData?.showOnlineStatus ?? true)) updatesForDb.showOnlineStatus = showOnlineStatus;
            if (selectedBubble !== (userData?.selectedBubble || "")) updatesForDb.selectedBubble = selectedBubble;
            if (JSON.stringify(interests.sort()) !== JSON.stringify((userData?.interests || []).sort())) updatesForDb.interests = interests;
            if (animatedNav !== (userData?.animatedNav ?? true)) updatesForDb.animatedNav = animatedNav;
            
            if (Object.keys(updatesForDb).length > 0) {
                 await updateUserProfile({ userId: user.uid, ...updatesForDb });
            }
            
            toast({ title: "Başarılı!", description: "Profiliniz başarıyla güncellendi." });
        } catch (error: any) {
            toast({ title: "Hata", description: error.message || "Profil güncellenirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendVerificationEmail = async () => {
        if (!user) return;
        try {
            await sendEmailVerification(user);
            toast({
                title: 'E-posta Gönderildi',
                description: 'Hesabınızı doğrulamak için lütfen e-posta kutunuzu kontrol edin.'
            });
        } catch (error: any) {
            console.error("Verification email error:", error);
            toast({ variant: 'destructive', description: "Doğrulama e-postası gönderilirken bir hata oluştu." });
        }
    }

    const handlePasswordReset = async () => {
        if (!user?.email) {
            toast({ variant: 'destructive', description: "E-posta adresiniz bulunamadı."});
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({
                title: "E-posta Gönderildi",
                description: "Şifrenizi sıfırlamak için e-posta kutunuzu kontrol edin."
            });
        } catch (error: any) {
            toast({ variant: 'destructive', description: "Şifre sıfırlama e-postası gönderilirken bir hata oluştu."});
        }
    }
    
    const handleDeleteAccount = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const result = await deleteUserAccount(user.uid);
            if (result.success) {
                toast({ title: "Hesabınız Silindi", description: "Tüm verileriniz kalıcı olarak silindi." });
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            toast({ variant: 'destructive', title: "Hata", description: error.message || "Hesap silinirken bir hata oluştu." });
        } finally {
            setIsSaving(false);
        }
    }
    
    const handleAddInterest = () => {
        const newInterest = currentInterest.trim();
        if (newInterest && !interests.includes(newInterest) && interests.length < 10) {
            setInterests([...interests, newInterest]);
            setCurrentInterest('');
        }
    };
    
    const handleRemoveInterest = (interestToRemove: string) => {
        setInterests(interests.filter(i => i !== interestToRemove));
    };
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };
    
    const currentLevelInfo = giftLevelThresholds.find(t => t.level === (userData?.giftLevel || 0)) || { level: 0, diamonds: 0 };
    const nextLevelInfo = giftLevelThresholds.find(t => t.level === (userData?.giftLevel || 0) + 1);
    
    let progress = 0;
    if (nextLevelInfo && userData) {
        const diamondsForCurrentLevel = currentLevelInfo.diamonds;
        const diamondsForNextLevel = nextLevelInfo.diamonds - diamondsForCurrentLevel;
        const progressInLevel = (userData.totalDiamondsSent || 0) - diamondsForCurrentLevel;
        progress = (progressInLevel / diamondsForNextLevel) * 100;
    } else {
        progress = 100; // Max level
    }

    if (loading || !user || !userData) {
        return <AnimatedLogoLoader fullscreen />;
    }

    return (
        <>
            <div className="space-y-6 pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><UserIcon className="h-6 w-6" />Profil Bilgileri</CardTitle>
                        <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col items-center gap-4">
                           <Link href="/avatar-studio" className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
                               <div className={cn("avatar-frame-wrapper", userData.selectedAvatarFrame)}>
                                    <Avatar className="relative z-[1] h-24 w-24 border-2 shadow-sm">
                                        <AvatarImage src={userData.photoURL || undefined} />
                                        <AvatarFallback className="text-4xl bg-primary/20">{userData.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                </div>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
                                    <Camera className="h-8 w-8" />
                                </div>
                            </Link>
                        </div>

                         <div className="space-y-2">
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bio">Biyografi</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" maxLength={150} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                               <Label htmlFor="age">Yaş</Label>
                               <Input id="age" type="number" value={age || ''} onChange={(e) => setAge(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Cinsiyet</Label>
                                <RadioGroup value={gender} onValueChange={(value: "male" | "female") => setGender(value)} className="flex space-x-4 pt-2">
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="male" id="male" /><Label htmlFor="male">Erkek</Label></div>
                                    <div className="flex items-center space-x-2"><RadioGroupItem value="female" id="female" /><Label htmlFor="female">Kadın</Label></div>
                                </RadioGroup>
                            </div>
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="interests">İlgi Alanlarım (Maks. 10)</Label>
                             <div className="flex gap-2">
                                <Input 
                                    id="interests" 
                                    value={currentInterest} 
                                    onChange={(e) => setCurrentInterest(e.target.value)} 
                                    onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddInterest(); } }}
                                    placeholder="örn: Kitap Okumak, Oyun"
                                />
                                <Button type="button" onClick={handleAddInterest}>Ekle</Button>
                            </div>
                             <div className="flex flex-wrap gap-2 pt-2">
                                {interests.map(interest => (
                                    <div key={interest} className="flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-3 py-1 text-sm">
                                        {interest}
                                        <button onClick={() => handleRemoveInterest(interest)} className="ml-1 text-muted-foreground hover:text-destructive">
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Accordion type="multiple" className="w-full space-y-4">
                     <AccordionItem value="item-3" asChild>
                         <Card>
                             <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Wallet className="h-6 w-6 text-primary" />
                                        <CardTitle>Cüzdan</CardTitle>
                                    </div>
                                    <CardDescription>Bakiye durumunu görüntüle ve mağazaya git.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                             <AccordionContent className="p-6 pt-0 space-y-4">
                                <div className="p-4 rounded-lg border bg-muted/50 flex justify-between items-center">
                                    <p className="font-semibold">Mevcut Elmas Bakiyesi</p>
                                    <div className="flex items-center gap-2 font-bold text-lg text-cyan-500">
                                        <Gem className="h-5 w-5"/> {userData.diamonds}
                                    </div>
                                </div>
                                <Button asChild className="w-full">
                                    <Link href="/wallet">Cüzdanı Yönet</Link>
                                </Button>
                             </AccordionContent>
                        </Card>
                    </AccordionItem>

                     <AccordionItem value="item-4" asChild>
                        <Card>
                            <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Gift className="h-6 w-6 text-primary" />
                                        <CardTitle>Hediye Seviyesi</CardTitle>
                                    </div>
                                    <CardDescription>Hediye göndererek seviye atla ve avantajlar kazan.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0 space-y-4">
                               <div className="text-center space-y-1">
                                    <p className="text-sm text-muted-foreground">Mevcut Seviyen</p>
                                    <p className="text-5xl font-bold text-amber-500 drop-shadow-lg">SV {userData.giftLevel || 0}</p>
                                </div>
                                {nextLevelInfo ? (
                                    <div>
                                         <div className="flex justify-between items-end mb-1">
                                            <p className="text-xs font-semibold">Seviye {nextLevelInfo.level} için ilerleme</p>
                                            <p className="text-xs text-muted-foreground">
                                                <span className="font-bold text-foreground">{(userData.totalDiamondsSent || 0).toLocaleString('tr-TR')}</span> / {nextLevelInfo.diamonds.toLocaleString('tr-TR')}
                                            </p>
                                        </div>
                                        <Progress value={progress} className="h-3"/>
                                    </div>
                                ) : (
                                    <p className="text-center font-semibold text-green-500">Maksimum seviyeye ulaştın!</p>
                                )}
                            </AccordionContent>
                        </Card>
                    </AccordionItem>

                    <AccordionItem value="item-1" asChild>
                        <Card>
                             <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Palette className="h-6 w-6 text-primary" />
                                        <CardTitle>Görünüm Ayarları</CardTitle>
                                    </div>
                                    <CardDescription>Uygulamanın genel görünümünü özelleştirin.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <Label htmlFor="animated-nav" className="font-semibold flex items-center gap-2"><Sliders className="h-4 w-4"/> Arayüz Animasyonları</Label>
                                            <p className="text-xs text-muted-foreground pl-6">Uygulama genelindeki arayüz geçişlerini ve efektleri etkinleştirir.</p>
                                        </div>
                                        <Switch id="animated-nav" checked={animatedNav} onCheckedChange={setAnimatedNav} />
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">Tema</Label>
                                        <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2 pt-2">
                                            <Label htmlFor="light-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'light' && "border-primary")}>
                                                <RadioGroupItem value="light" id="light-theme" className="sr-only" />
                                                <Sun className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Aydınlık</span>
                                            </Label>
                                            <Label htmlFor="dark-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'dark' && "border-primary")}>
                                                <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                                                <Moon className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Karanlık</span>
                                            </Label>
                                            <Label htmlFor="system-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'system' && "border-primary")}>
                                                <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                                                <Laptop className="mb-2 h-6 w-6" />
                                                <span className="font-bold text-xs">Sistem</span>
                                            </Label>
                                        </RadioGroup>
                                    </div>
                                    <div>
                                        <Label className="text-base font-medium">Sohbet Baloncuğu</Label>
                                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                                            {bubbleOptions.map(option => (
                                                <button key={option.id} onClick={() => setSelectedBubble(option.id)} disabled={option.isPremium && !isPremium} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50", selectedBubble === option.id ? "border-primary" : "")}>
                                                    <div className="relative h-12 w-12 bg-muted rounded-full overflow-hidden">
                                                        {option.id !== "" && (<div className={`bubble-wrapper ${option.id}`}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}</div>)}
                                                        {option.isPremium && <Crown className="absolute top-1 right-1 h-4 w-4 text-red-500"/>}
                                                    </div>
                                                    <span className="text-xs font-bold text-center">{option.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                    
                    <AccordionItem value="item-2" asChild>
                         <Card>
                             <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-6 w-6 text-primary" />
                                        <CardTitle>Hesap Güvenliği</CardTitle>
                                    </div>
                                    <CardDescription>Hesabınızın gizliliğini ve güvenliğini yönetin.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                             <AccordionContent className="p-6 pt-0 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="privacy-mode" className="font-semibold">Gizli Hesap</Label>
                                        <p className="text-xs text-muted-foreground">Aktif olduğunda, sadece onayladığın kişiler seni takip edebilir.</p>
                                    </div>
                                    <Switch id="privacy-mode" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                                </div>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <Label htmlFor="requests-mode" className={cn("font-semibold transition-colors", !privateProfile && "text-muted-foreground/50")}>Takip İsteklerine İzin Ver</Label>
                                        <p className={cn("text-xs text-muted-foreground transition-colors", !privateProfile && "text-muted-foreground/50")}>Kapalıysa, kimse size takip isteği gönderemez.</p>
                                    </div>
                                    <Switch id="requests-mode" checked={acceptsFollowRequests} onCheckedChange={setAcceptsFollowRequests} disabled={!privateProfile}/>
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <Label htmlFor="online-status" className="font-semibold">Çevrimiçi Durumumu Göster</Label>
                                        <p className="text-xs text-muted-foreground">Aktif olduğunda, diğer kullanıcılar çevrimiçi olduğunu görebilir.</p>
                                    </div>
                                    <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                                </div>
                                 <div className="flex items-center justify-between">
                                    <Button variant="outline" className="w-full" onClick={() => setIsBlockedUsersOpen(true)}>
                                        <ShieldOff className="mr-2 h-4 w-4"/>Engellenen Hesapları Yönet
                                    </Button>
                                </div>
                                 <div className="space-y-2 rounded-lg border p-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="font-semibold">E-posta Doğrulaması</Label>
                                            <p className="text-xs text-muted-foreground">{user.email}</p>
                                        </div>
                                        {user.emailVerified ? (
                                            <span className="flex items-center text-sm font-semibold text-green-600"><BadgeCheck className="mr-2 h-4 w-4"/>Doğrulandı</span>
                                        ) : (
                                            <Button size="sm" variant="secondary" onClick={handleSendVerificationEmail}>Doğrula</Button>
                                        )}
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                     
                    <AccordionItem value="item-5" asChild>
                        <Card>
                            <AccordionTrigger className="p-6">
                                <CardHeader className="p-0 text-left">
                                    <div className="flex items-center gap-3">
                                        <Sparkles className="h-6 w-6 text-primary" />
                                        <CardTitle>Ekstra</CardTitle>
                                    </div>
                                    <CardDescription>Davet sistemi, dil ayarları ve daha fazlası.</CardDescription>
                                </CardHeader>
                            </AccordionTrigger>
                            <AccordionContent className="p-6 pt-0">
                                 <div className="space-y-6">
                                    <div>
                                        <div className="flex items-center gap-3 mb-2">
                                            <Gift className="h-5 w-5 text-muted-foreground" />
                                            <Label className="text-base font-semibold">{t('invitation_system')}</Label>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Bu linki arkadaşlarınla paylaş. Senin linkinle kayıt olan her arkadaşın için <strong>10 elmas</strong> kazan!
                                        </p>
                                         <div className="text-sm font-semibold p-2 bg-muted rounded-md text-center flex items-center justify-center gap-2 mt-2">
                                            <Users className="h-4 w-4"/>
                                            <span>Bu linkle toplam <span className="text-primary">{userData.referralCount || 0}</span> kişi kayıt oldu.</span>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <Input value={inviteLink} readOnly className="text-sm" />
                                            <Button onClick={copyToClipboard} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                    <div>
                                         <div className="flex items-center gap-3 mb-2">
                                            <Globe className="h-5 w-5 text-muted-foreground" />
                                            <Label className="text-base font-semibold">{t('language_settings')}</Label>
                                        </div>
                                         <LanguageSwitcher />
                                    </div>
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </Accordion>
                    
                {userData.role === 'admin' && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Shield className="h-6 w-6 text-primary" />
                                <CardTitle>Yönetim</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Button asChild>
                                <Link href="/admin">
                                    <Shield className="mr-2 h-4 w-4" />
                                    Yönetim Paneline Git
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                )}
                    
                <Card>
                    <CardHeader>
                        <CardTitle>Hesap İşlemleri</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row gap-2">
                        <Button variant="outline" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
                        </Button>
                        <Button variant="outline" onClick={handlePasswordReset}>
                            <Lock className="mr-2 h-4 w-4" />Şifremi Değiştir
                        </Button>
                         <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 className="mr-2 h-4 w-4" />Hesabımı Sil
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            <AnimatePresence>
            {hasChanges && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-background/80 backdrop-blur-sm border-t"
                >
                    <div className="container mx-auto flex justify-between items-center max-w-4xl">
                        <p className="text-sm font-semibold">Kaydedilmemiş değişiklikleriniz var.</p>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save_changes')}
                        </Button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
            
            <BlockedUsersDialog isOpen={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen} blockedUserIds={userData.blockedUsers || []}/>

             <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert/>Hesabını Silmek Üzeresin</AlertDialogTitle>
                        <AlertDialogDescription>
                           Bu işlem geri alınamaz. Hesabını silmek istediğinden emin misin? Tüm gönderilerin, yorumların, takipçilerin ve diğer verilerin kalıcı olarak silinecektir.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteAccount}
                            className="bg-destructive hover:bg-destructive/80"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                            Evet, Hesabımı Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
