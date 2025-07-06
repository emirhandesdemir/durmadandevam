// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Camera, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect, useMemo } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import ProfileViewerList from "./ProfileViewerList";
import { Textarea } from "../ui/textarea";
import { useRouter } from 'next/navigation';
import { findUserByUsername, updateUserPosts, updateUserComments } from "@/lib/actions/userActions";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { AnimatePresence, motion } from "framer-motion";
import Link from 'next/link';

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

    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

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
        }
        if (user) {
            const encodedRef = btoa(user.uid);
            setInviteLink(`${window.location.origin}/signup?ref=${encodedRef}`);
        }
    }, [userData, user]);
    
    const hasChanges = useMemo(() => 
        username !== (userData?.username || "") || 
        bio !== (userData?.bio || "") ||
        (age || undefined) !== (userData?.age || undefined) ||
        city !== (userData?.city || "") ||
        country !== (userData?.country || "") ||
        gender !== (userData?.gender || undefined) ||
        privateProfile !== (userData?.privateProfile || false) || 
        acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true) ||
        showOnlineStatus !== (userData?.showOnlineStatus ?? true) ||
        newAvatar !== null || 
        selectedBubble !== (userData?.selectedBubble || "") || 
        selectedAvatarFrame !== (userData?.selectedAvatarFrame || ""),
    [username, bio, age, city, country, gender, privateProfile, acceptsFollowRequests, showOnlineStatus, newAvatar, selectedBubble, selectedAvatarFrame, userData]);
    
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
            const postAndCommentUpdates: { username?: string; userAvatar?: string; userAvatarFrame?: string; } = {};
    
            // Process Avatar
            if (newAvatar) {
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.jpg`);
                await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(newAvatarRef);
                userDocUpdates.photoURL = finalPhotoURL;
                authProfileUpdates.photoURL = finalPhotoURL;
                postAndCommentUpdates.userAvatar = finalPhotoURL;
            }
    
            // Process Username
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
            
            // Process Avatar Frame
            if (selectedAvatarFrame !== (userData?.selectedAvatarFrame || "")) {
                userDocUpdates.selectedAvatarFrame = selectedAvatarFrame;
                postAndCommentUpdates.userAvatarFrame = selectedAvatarFrame;
            }

            // Other fields
            if (bio !== userData?.bio) userDocUpdates.bio = bio;
            if (age !== userData?.age) userDocUpdates.age = Number(age);
            if (city !== userData?.city) userDocUpdates.city = city;
            if (country !== userData?.country) userDocUpdates.country = country;
            if (gender !== userData?.gender) userDocUpdates.gender = gender;
            if (privateProfile !== userData?.privateProfile) userDocUpdates.privateProfile = privateProfile;
            if (acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) userDocUpdates.acceptsFollowRequests = acceptsFollowRequests;
            if (showOnlineStatus !== (userData?.showOnlineStatus ?? true)) userDocUpdates.showOnlineStatus = showOnlineStatus;
            if (selectedBubble !== (userData?.selectedBubble || "")) userDocUpdates.selectedBubble = selectedBubble;


            // Execute database updates
            const userDocRef = doc(db, 'users', user.uid);
            if (Object.keys(userDocUpdates).length > 0) {
                await updateDoc(userDocRef, userDocUpdates);
            }
    
            if (Object.keys(authProfileUpdates).length > 0) {
                 await updateProfile(auth.currentUser, authProfileUpdates);
            }

            // Propagate visual changes to all posts and comments
            if (Object.keys(postAndCommentUpdates).length > 0) {
                try {
                    await Promise.all([
                        updateUserPosts(user.uid, postAndCommentUpdates),
                        updateUserComments(user.uid, postAndCommentUpdates)
                    ]);
                } catch(e) {
                    console.error("Error propagating profile updates", e);
                    toast({
                        variant: "destructive",
                        title: "Yansıtma Hatası",
                        description: "Profiliniz güncellendi ancak eski gönderi ve yorumlarınıza yansıtılamadı. Bu bir indeksleme sorunu olabilir, lütfen konsolu kontrol edin."
                    })
                }
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

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };

    return (
        <>
            <div className="w-full max-w-4xl mx-auto space-y-8 pb-24">
                <div className="flex flex-col items-center gap-4">
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <button
                        type="button"
                        onClick={handleAvatarClick}
                        className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        aria-label="Profil fotoğrafını değiştir"
                    >
                        <div className={cn("avatar-frame-wrapper", selectedAvatarFrame)}>
                            <Avatar className="relative z-[1] h-24 w-24 border-4 border-background shadow-lg transition-all group-hover:brightness-90">
                                <AvatarImage src={newAvatar || userData.photoURL || undefined} />
                                <AvatarFallback className="text-4xl bg-primary/20">{username?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
                            <Camera className="h-8 w-8" />
                        </div>
                    </button>
                    <div className="text-center">
                        <h1 className="text-3xl font-bold">{userData?.username || user.displayName}</h1>
                        <p className="text-muted-foreground">{userData?.email}</p>
                    </div>
                </div>
                
                {/* Profile Info Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <UserIcon className="h-6 w-6 text-primary" />
                            <CardTitle>Profil Bilgileri</CardTitle>
                        </div>
                        <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                         <div className="space-y-2">
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="bio">Biyografi</Label>
                            <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" />
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
                    </CardContent>
                </Card>

                {/* Appearance Card */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Palette className="h-6 w-6 text-primary" />
                            <CardTitle>Görünüm Ayarları</CardTitle>
                        </div>
                        <CardDescription>Uygulamanın ve profilinizin görünümünü özelleştirin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                    </CardContent>
                </Card>
                
                {/* Privacy Card */}
                <Card>
                    <CardHeader>
                         <div className="flex items-center gap-3">
                            <Lock className="h-6 w-6 text-primary" />
                            <CardTitle>Gizlilik ve Güvenlik</CardTitle>
                        </div>
                        <CardDescription>Hesabınızın gizliliğini ve kimlerin sizinle etkileşim kurabileceğini yönetin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
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
                    </CardContent>
                </Card>

                {/* Extras Card */}
                 <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <Sparkles className="h-6 w-6 text-primary" />
                            <CardTitle>Ekstra</CardTitle>
                        </div>
                        <CardDescription>Davet sistemi, dil ayarları ve daha fazlası.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
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
                    </CardContent>
                </Card>
                
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
                 {/* Logout Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Hesap İşlemleri</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Button variant="destructive" onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
                        </Button>
                    </CardContent>
                </Card>

            </div>

            {/* Floating Save Bar */}
            <AnimatePresence>
            {hasChanges && (
                <motion.div
                    initial={{ y: "100%", opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: "100%", opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t"
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
