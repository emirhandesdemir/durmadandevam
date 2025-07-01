// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Edit, Shield, BadgeCheck, Palette, Sun, Moon, Laptop, Loader2, Sparkles, Lock, Eye, Camera, Settings, Gift, Copy, Users, Globe } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import ProfileViewerList from "./ProfileViewerList";
import { Textarea } from "../ui/textarea";
import { useRouter } from 'next/navigation';
import { findUserByUsername } from "@/lib/actions/userActions";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";

const bubbleOptions = [
    { id: "", name: "Yok" },
    { id: "bubble-style-1", name: "Neon" },
    { id: "bubble-style-2", name: "Okyanus" },
    { id: "bubble-style-3", name: "Gün Batımı" },
    { id: "bubble-style-4", name: "Orman" },
    { id: "bubble-style-fire", name: "Alevli" },
];

const avatarFrameOptions = [
    { id: "", name: "Yok" },
    { id: "avatar-frame-angel", name: "Melek Kanadı" },
    { id: "avatar-frame-devil", name: "Şeytan Kanadı" },
    { id: "avatar-frame-snake", name: "Yılan" },
    { id: "avatar-frame-tech", name: "Tekno Aura" },
];

export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [age, setAge] = useState<number | undefined>(undefined);
    const [city, setCity] = useState("");
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [selectedBubble, setSelectedBubble] = useState("");
    const [selectedAvatarFrame, setSelectedAvatarFrame] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inviteLink, setInviteLink] = useState("");


    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setAge(userData.age);
            setCity(userData.city || "");
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
            setSelectedBubble(userData.selectedBubble || "");
            setSelectedAvatarFrame(userData.selectedAvatarFrame || "");
        }
        if (user) {
            // Encode the UID to create a cleaner referral link
            const encodedRef = btoa(user.uid);
            setInviteLink(`${window.location.origin}/signup?ref=${encodedRef}`);
        }
    }, [userData, user]);
    
    const hasChanges = 
        username !== (userData?.username || "") || 
        bio !== (userData?.bio || "") ||
        age !== (userData?.age || undefined) ||
        city !== (userData?.city || "") ||
        privateProfile !== (userData?.privateProfile || false) || 
        acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true) ||
        showOnlineStatus !== (userData?.showOnlineStatus ?? true) ||
        newAvatar !== null || 
        selectedBubble !== (userData?.selectedBubble || "") || 
        selectedAvatarFrame !== (userData?.selectedAvatarFrame || "");
    
    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) {
                toast({ variant: "destructive", description: "Resim boyutu 5MB'dan büyük olamaz." });
                return;
            }
            const reader = new FileReader();
            reader.onload = () => setImageToCrop(reader.result as string);
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleCropComplete = (croppedDataUrl: string) => {
        setImageToCrop(null); 
        setNewAvatar(croppedDataUrl);
    };

    const handleSaveChanges = async () => {
        if (!user || !hasChanges || !auth.currentUser) return;
    
        setIsSaving(true);
        try {
            const updates: { [key: string]: any } = {};
            const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
    
            if (newAvatar) {
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.png`);
                const snapshot = await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(snapshot.ref);
                
                updates.photoURL = finalPhotoURL;
                authProfileUpdates.photoURL = finalPhotoURL;
            }
    
            if (username !== userData?.username) {
                 if (!username.startsWith('@') || !/^@\w+$/.test(username)) {
                    toast({ variant: "destructive", title: "Geçersiz Kullanıcı Adı", description: "Kullanıcı adı '@' ile başlamalı ve sadece harf, rakam veya alt çizgi içermelidir." });
                    setIsSaving(false);
                    return;
                }
                const existingUser = await findUserByUsername(username);
                if (existingUser && existingUser.uid !== user.uid) {
                    toast({ variant: "destructive", title: "Kullanıcı Adı Alınmış", description: "Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor." });
                    setIsSaving(false);
                    return;
                }
                updates.username = username;
                authProfileUpdates.displayName = username;
            }
            if (bio !== userData?.bio) updates.bio = bio;
            if (age !== userData?.age) updates.age = Number(age);
            if (city !== userData?.city) updates.city = city;
            if (privateProfile !== userData?.privateProfile) updates.privateProfile = privateProfile;
            if (acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) updates.acceptsFollowRequests = acceptsFollowRequests;
            if (showOnlineStatus !== (userData?.showOnlineStatus ?? true)) updates.showOnlineStatus = showOnlineStatus;
            if (selectedBubble !== (userData?.selectedBubble || "")) updates.selectedBubble = selectedBubble;
            if (selectedAvatarFrame !== (userData?.selectedAvatarFrame || "")) updates.selectedAvatarFrame = selectedAvatarFrame;
    
            if (Object.keys(updates).length > 0) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, updates);
            }
    
            if (Object.keys(authProfileUpdates).length > 0) {
                 await updateProfile(auth.currentUser, authProfileUpdates);
            }

            toast({
                title: "Başarılı!",
                description: "Profiliniz başarıyla güncellendi.",
            });
            setNewAvatar(null); 
            router.refresh(); 
    
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
    
    if (loading || !user || !userData) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const isAdmin = userData?.role === 'admin';

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };

    return (
        <>
            <Card className="w-full max-w-2xl shadow-xl rounded-3xl border-0">
                <CardHeader className="items-center text-center pt-8">
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label="Profil fotoğrafını değiştir"
                    >
                        <div className={cn("avatar-frame-wrapper", selectedAvatarFrame)}>
                            <Avatar className="relative z-[1] h-32 w-32 border-4 border-white shadow-lg transition-all group-hover:brightness-90">
                                <AvatarImage src={newAvatar || userData.photoURL || undefined} />
                                <AvatarFallback className="text-5xl bg-primary/20">{username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
                            <Camera className="h-10 w-10" />
                        </div>
                    </button>
                    <div className="flex items-center gap-2 mt-4">
                        <CardTitle className="text-3xl font-bold">{userData?.username || user.displayName}</CardTitle>
                        {isAdmin && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger><BadgeCheck className="h-7 w-7 text-primary fill-primary/30" /></TooltipTrigger>
                                    <TooltipContent><p>Yönetici Hesabı</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 px-6">
                    <Accordion type="single" collapsible className="w-full">
                         <AccordionItem value="profile">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Users className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Profil Bilgileri</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Kullanıcı Adı</Label>
                                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                </div>
                                 <div className="grid grid-cols-2 gap-4">
                                     <div className="space-y-2">
                                        <Label htmlFor="age">Yaş</Label>
                                        <Input id="age" type="number" value={age || ''} onChange={(e) => setAge(Number(e.target.value))} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Şehir</Label>
                                        <Input id="city" value={city} onChange={(e) => setCity(e.target.value)} />
                                    </div>
                                 </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bio">Biyografi</Label>
                                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" />
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="privacy">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Lock className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{t('privacy_settings')}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <div className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <Label htmlFor="privacy-mode" className="font-semibold">Gizli Hesap</Label>
                                        <p className="text-xs text-muted-foreground">Aktif olduğunda, sadece onayladığın kişiler seni takip edebilir.</p>
                                    </div>
                                    <Switch id="privacy-mode" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                                </div>
                                <div className="flex items-center justify-between rounded-lg border p-3">
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
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="invite">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Gift className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{t('invitation_system')}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Bu linki arkadaşlarınla paylaş. Senin linkinle kayıt olan her arkadaşın için <strong>10 elmas</strong> kazan!
                                </p>
                                 <div className="text-sm font-semibold p-2 bg-muted rounded-md text-center flex items-center justify-center gap-2">
                                    <Users className="h-4 w-4"/>
                                    <span>Bu linkle toplam <span className="text-primary">{userData.referralCount || 0}</span> kişi kayıt oldu.</span>
                                </div>
                                <div className="flex gap-2">
                                    <Input value={inviteLink} readOnly className="text-sm" />
                                    <Button onClick={copyToClipboard} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="viewers">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Eye className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{t('profile_viewers')}</span></div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ProfileViewerList />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="language">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Globe className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{t('language_settings')}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="flex justify-center pt-4">
                               <LanguageSwitcher />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="appearance">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Palette className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">{t('appearance_settings')}</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <div>
                                    <Label className="text-sm font-medium">Tema</Label>
                                    <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2 pt-2">
                                        <Label htmlFor="light-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <RadioGroupItem value="light" id="light-theme" className="sr-only" />
                                        <Sun className="mb-2 h-6 w-6" />
                                        <span className="text-xs font-bold">Aydınlık</span>
                                        </Label>
                                        <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                                        <Moon className="mb-2 h-6 w-6" />
                                        <span className="text-xs font-bold">Karanlık</span>
                                        </Label>
                                        <Label htmlFor="system-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                        <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                                        <Laptop className="mb-2 h-6 w-6" />
                                        <span className="text-xs font-bold">Sistem</span>
                                        </Label>
                                    </RadioGroup>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Sohbet Baloncuğu</Label>
                                    <div className="grid grid-cols-3 gap-2 pt-2">
                                        {bubbleOptions.map(option => (
                                            <div key={option.id} onClick={() => setSelectedBubble(option.id)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent", selectedBubble === option.id ? "border-primary" : "")}>
                                                <div className="relative h-12 w-12 bg-muted rounded-full overflow-hidden">
                                                    {option.id !== "" && (<div className={`bubble-wrapper ${option.id}`}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}</div>)}
                                                </div>
                                                <span className="text-xs font-bold text-center">{option.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-sm font-medium">Avatar Çerçevesi</Label>
                                     <div className="grid grid-cols-3 gap-2 pt-2">
                                        {avatarFrameOptions.map(option => (
                                            <div key={option.id} onClick={() => setSelectedAvatarFrame(option.id)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent", selectedAvatarFrame === option.id ? "border-primary" : "")}>
                                                <div className={cn("avatar-frame-wrapper h-12 w-12", option.id)}><Avatar className="relative z-[1] h-full w-full bg-muted" /></div>
                                                <span className="text-xs font-bold text-center">{option.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
                <CardFooter className="flex flex-wrap justify-center gap-4 p-6 border-t mt-4">
                    <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto rounded-full"><LogOut className="mr-2" />{t('logout')}</Button>
                    {isAdmin && (
                        <Button asChild className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700"><Link href="/admin/dashboard"><Shield className="mr-2" />{t('admin_panel')}</Link></Button>
                    )}
                    <Button onClick={handleSaveChanges} className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={!hasChanges || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save_changes')}
                    </Button>
                </CardFooter>
            </Card>
            <ImageCropperDialog 
              isOpen={!!imageToCrop} 
              setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)} 
              imageSrc={imageToCrop} 
              aspectRatio={1} 
              onCropComplete={handleCropComplete} 
              circularCrop={true}
            />
        </>
    );
}
