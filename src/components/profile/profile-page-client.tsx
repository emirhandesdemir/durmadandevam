
// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/navigation';
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Link from "next/link";
import BlockedUsersDialog from "./BlockedUsersDialog";
import { updateUserProfile } from "@/lib/actions/userActions";
import { Textarea } from "../ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { ScrollArea } from "../ui/scroll-area";

const bubbleOptions = [
    { id: "", name: "Yok" },
    { id: "bubble-style-1", name: "Neon" },
    { id: "bubble-style-2", name: "Okyanus" },
    { id: "bubble-style-3", name: "Gün Batımı" },
    { id: "bubble-style-4", name: "Orman" },
    { id: "bubble-style-fire", name: "Alevli" },
    { id: "bubble-style-premium", name: "Premium", isPremium: true },
];

const avatarFrameOptions = [
    { id: "", name: "Yok" },
    { id: "avatar-frame-angel", name: "Melek Kanadı" },
    { id: "avatar-frame-devil", name: "Şeytan Kanadı" },
    { id: "avatar-frame-snake", name: "Yılan" },
    { id: "avatar-frame-tech", name: "Tekno Aura" },
    { id: "avatar-frame-premium", name: "Premium", isPremium: true },
];

const EMOJI_LIST = ['🙂', '😂', '😍', '🤔', '😎', '😢', '😡', '🤯', '🥳', '👍', '👎', '❤️', '🔥', '⭐', '🚀', '🌈', '💡', '🤖', '👻', '👽', '👾', '👑', '🎩', '💼'];

export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [age, setAge] = useState<number | string>("");
    const [city, setCity] = useState("");
    const [country, setCountry] = useState("");
    const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [profileEmoji, setProfileEmoji] = useState<string | null>("");
    const [selectedBubble, setSelectedBubble] = useState("");
    const [selectedAvatarFrame, setSelectedAvatarFrame] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [inviteLink, setInviteLink] = useState("");
    const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
    const [interests, setInterests] = useState<string[]>([]);
    const [currentInterest, setCurrentInterest] = useState("");

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setAge(userData.age || "");
            setCity(userData.city || "");
            setCountry(userData.country || "");
            setGender(userData.gender);
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
            setProfileEmoji(userData.profileEmoji || '🙂');
            setSelectedBubble(userData.selectedBubble || "");
            setSelectedAvatarFrame(userData.selectedAvatarFrame || "");
            setInterests(userData.interests || []);
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
        if (city.trim() !== (userData.city || '').trim()) return true;
        if (country.trim() !== (userData.country || '').trim()) return true;
        if (gender !== (userData.gender || undefined)) return true;
        if (privateProfile !== (userData.privateProfile || false)) return true;
        if (acceptsFollowRequests !== (userData.acceptsFollowRequests ?? true)) return true;
        if (showOnlineStatus !== (userData.showOnlineStatus ?? true)) return true;
        if ((profileEmoji || '🙂') !== (userData.profileEmoji || '🙂')) return true;
        if (selectedBubble !== (userData.selectedBubble || '')) return true;
        if (selectedAvatarFrame !== (userData.selectedAvatarFrame || '')) return true;
        if (JSON.stringify(interests.map(i => i.trim()).sort()) !== JSON.stringify((userData.interests || []).map(i => i.trim()).sort())) return true;
    
        return false;
    }, [
        username, bio, age, city, country, gender, privateProfile, 
        acceptsFollowRequests, showOnlineStatus, profileEmoji, selectedBubble, 
        selectedAvatarFrame, interests, userData
    ]);
    
    
    const handleSaveChanges = async () => {
        if (!user || !hasChanges) return;

        setIsSaving(true);
        try {
            const result = await updateUserProfile({
                userId: user.uid,
                username, bio, age, city, country, gender, privateProfile,
                acceptsFollowRequests, showOnlineStatus, profileEmoji,
                selectedBubble, selectedAvatarFrame, interests
            });

            if (!result.success) {
                throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
            }
            
            toast({
                title: "Başarılı!",
                description: "Profiliniz başarıyla güncellendi.",
            });
            
        } catch (error: any) {
            toast({
                title: "Hata",
                description: error.message || "Profil güncellenirken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

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
    
    if (loading || !user || !userData) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };

    return (
        <>
            <div className="space-y-6 pb-32">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><UserIcon className="h-6 w-6" />Profil Bilgileri</CardTitle>
                        <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="flex items-center gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="emoji">Profil Emoji</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-20 h-20 text-4xl text-center rounded-2xl">
                                            {profileEmoji}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                        <div className="grid grid-cols-6 gap-1 p-2">
                                            {EMOJI_LIST.map(emoji => (
                                                <Button
                                                    key={emoji}
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-2xl rounded-lg"
                                                    onClick={() => setProfileEmoji(emoji)}
                                                >
                                                    {emoji}
                                                </Button>
                                            ))}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2 flex-1">
                                <Label htmlFor="username">Kullanıcı Adı</Label>
                                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                            </div>
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
                                <RadioGroup
                                    value={gender}
                                    onValueChange={(value: 'male' | 'female') => setGender(value)}
                                    className="flex space-x-4 pt-2"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="male" id="male" />
                                        <Label htmlFor="male" className="font-normal cursor-pointer">Erkek</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="female" id="female" />
                                        <Label htmlFor="female" className="font-normal cursor-pointer">Kadın</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="city">Şehir</Label>
                                <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="country">Ülke</Label>
                                <Input id="country" value={country} onChange={(e) => setCountry(e.target.value)} />
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
                                    <div>
                                        <Label className="text-base font-medium">Avatar Çerçevesi</Label>
                                         <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-2">
                                            {avatarFrameOptions.map(option => (
                                                <button key={option.id} onClick={() => setSelectedAvatarFrame(option.id)} disabled={option.isPremium && !isPremium} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50", selectedAvatarFrame === option.id ? "border-primary" : "")}>
                                                    <div className={cn("avatar-frame-wrapper h-12 w-12", option.id)}>
                                                        <Avatar className="relative z-[1] h-full w-full bg-muted" />
                                                        {option.isPremium && <Crown className="absolute top-0 right-0 h-4 w-4 text-red-500"/>}
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
                                        <Lock className="h-6 w-6 text-primary" />
                                        <CardTitle>Gizlilik ve Güvenlik</CardTitle>
                                    </div>
                                    <CardDescription>Hesabınızın gizliliğini ve kimlerin sizinle etkileşim kurabileceğini yönetin.</CardDescription>
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
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                     
                    <AccordionItem value="item-4" asChild>
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
                    <CardContent className="flex flex-wrap gap-2">
                        <Button variant="destructive" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
                        </Button>
                    </CardContent>
                </Card>
            </div>
            
            {hasChanges && (
                <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t">
                    <div className="container mx-auto flex justify-between items-center max-w-2xl">
                        <p className="text-sm font-semibold">Kaydedilmemiş değişiklikleriniz var.</p>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save_changes')}
                        </Button>
                    </div>
                </div>
            )}
            
             <BlockedUsersDialog isOpen={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen} blockedUserIds={userData.blockedUsers || []}/>
        </>
    );
}
