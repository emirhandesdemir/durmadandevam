// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Camera, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, Brush, ShieldOff, X } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect, useMemo } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import ImageCropperDialog from "../common/ImageCropperDialog";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Textarea } from "../ui/textarea";
import { useRouter } from 'next/navigation';
import { findUserByUsername, updateUserPosts, updateUserComments } from "@/lib/actions/userActions";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import Link from "next/link";
import BlockedUsersDialog from "./BlockedUsersDialog";
import { motion, AnimatePresence } from 'framer-motion';

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

async function dataUriToBlob(dataUri: string): Promise<Blob> {
    const response = await fetch(dataUri);
    const blob = await response.blob();
    return blob;
}


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
    const [country, setCountry] = useState("");
    const [gender, setGender] = useState<'male' | 'female' | undefined>(undefined);
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
    const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
    const [interests, setInterests] = useState<string[]>([]);
    const [currentInterest, setCurrentInterest] = useState("");

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();


    // Populate state from userData
    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setAge(userData.age);
            setCity(userData.city || "");
            setCountry(userData.country || "");
            setGender(userData.gender);
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
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
        
        const interestsChanged = JSON.stringify(interests.sort()) !== JSON.stringify((userData.interests || []).sort());
    
        const ageValue = age === undefined ? null : Number(age);
        const userDataAgeValue = userData.age === undefined ? null : Number(userData.age);
    
        return (
            username !== (userData.username || "") ||
            bio !== (userData.bio || "") ||
            ageValue !== userDataAgeValue ||
            city !== (userData.city || "") ||
            country !== (userData.country || "") ||
            gender !== (userData.gender || undefined) ||
            privateProfile !== (userData.privateProfile || false) ||
            acceptsFollowRequests !== (userData.acceptsFollowRequests ?? true) ||
            showOnlineStatus !== (userData.showOnlineStatus ?? true) ||
            newAvatar !== null ||
            selectedBubble !== (userData?.selectedBubble || "") ||
            selectedAvatarFrame !== (userData?.selectedAvatarFrame || "") ||
            interestsChanged
        );
    }, [username, bio, age, city, country, gender, privateProfile, acceptsFollowRequests, showOnlineStatus, newAvatar, selectedBubble, selectedAvatarFrame, interests, userData]);
    
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
            const userDocUpdates: { [key: string]: any } = {};
            const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
            const postAndCommentUpdates: { [key: string]: any } = {};
    
            // Process Avatar
            if (newAvatar) {
                const imageBlob = await dataUriToBlob(newAvatar);
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.jpg`);
                await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(newAvatarRef);
                userDocUpdates.photoURL = finalPhotoURL;
                authProfileUpdates.photoURL = finalPhotoURL;
                postAndCommentUpdates.photoURL = finalPhotoURL;
            }
    
            if (username !== userData?.username) {
                if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                    toast({ variant: "destructive", title: "Geçersiz Kullanıcı Adı", description: "Kullanıcı adı 3-20 karakter uzunluğunda olmalı ve sadece harf, rakam veya alt çizgi içermelidir." });
                    setIsSaving(false); return;
                }
                const existingUser = await findUserByUsername(username);
                if (existingUser && existingUser.uid !== user.uid) {
                    toast({ variant: "destructive", title: "Kullanıcı Adı Alınmış", description: "Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor." });
                    setIsSaving(false); return;
                }
                userDocUpdates.username = username;
                authProfileUpdates.displayName = username;
                postAndCommentUpdates.username = username;
            }
            
            if (selectedAvatarFrame !== (userData?.selectedAvatarFrame || "")) {
                userDocUpdates.selectedAvatarFrame = selectedAvatarFrame;
                postAndCommentUpdates.userAvatarFrame = selectedAvatarFrame;
            }
            
            if (bio !== userData?.bio) userDocUpdates.bio = bio;
            if (Number(age) !== Number(userData?.age)) userDocUpdates.age = Number(age) || 0;
            if (city !== userData?.city) userDocUpdates.city = city;
            if (country !== userData?.country) userDocUpdates.country = country;
            if (gender !== userData?.gender) userDocUpdates.gender = gender;
            if(privateProfile !== userData?.privateProfile) userDocUpdates.privateProfile = privateProfile;
            if(acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) userDocUpdates.acceptsFollowRequests = acceptsFollowRequests;
            if(showOnlineStatus !== (userData?.showOnlineStatus ?? true)) userDocUpdates.showOnlineStatus = showOnlineStatus;
            if(selectedBubble !== userData?.selectedBubble) userDocUpdates.selectedBubble = selectedBubble;
            if (JSON.stringify(interests.sort()) !== JSON.stringify((userData?.interests || []).sort())) {
                userDocUpdates.interests = interests;
            }
    
            const userDocRef = doc(db, 'users', user.uid);
            if (Object.keys(userDocUpdates).length > 0) {
                await updateDoc(userDocRef, userDocUpdates);
            }
    
            if (Object.keys(authProfileUpdates).length > 0) {
                 await updateProfile(auth.currentUser, authProfileUpdates);
            }

            if (Object.keys(postAndCommentUpdates).length > 0) {
                await Promise.all([
                    updateUserPosts(user.uid, postAndCommentUpdates),
                    updateUserComments(user.uid, postAndCommentUpdates)
                ]);
            }

            toast({
                title: "Başarılı!",
                description: "Profiliniz başarıyla güncellendi.",
            });
            setNewAvatar(null);
            
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
            <div className="space-y-6 pb-24">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3"><UserIcon className="h-6 w-6" />Profil Bilgileri</CardTitle>
                        <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            <button type="button" onClick={handleAvatarClick} className="relative group">
                                <Avatar className="h-20 w-20">
                                    <AvatarImage src={newAvatar || userData.photoURL || undefined} />
                                    <AvatarFallback className="text-2xl">{username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-6 w-6" />
                                </div>
                            </button>
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
                                <Input id="age" type="number" value={age || ''} onChange={(e) => setAge(Number(e.target.value))} />
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

            <div
                className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t"
            >
                <div className="container mx-auto flex justify-between items-center max-w-4xl">
                     <p className={cn("text-sm font-semibold transition-opacity duration-300", hasChanges ? "opacity-100" : "opacity-0")}>
                        Kaydedilmemiş değişiklikler var.
                     </p>
                    <Button onClick={handleSaveChanges} disabled={isSaving || !hasChanges} size="lg">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('save_changes')}
                    </Button>
                </div>
            </div>
            
            <ImageCropperDialog 
              isOpen={!!imageToCrop} 
              setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)} 
              imageSrc={imageToCrop} 
              aspectRatio={1} 
              onCropComplete={handleCropComplete} 
              circularCrop={true}
            />
             <BlockedUsersDialog isOpen={isBlockedUsersOpen} onOpenChange={setIsBlockedUsersOpen} blockedUserIds={userData.blockedUsers || []}/>
        </>
    );
}
