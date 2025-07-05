// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, BadgeCheck, Palette, Sun, Moon, Laptop, Loader2, Sparkles, Lock, Eye, Camera, Gift, Copy, Users, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User as UserIcon } from "lucide-react";
import { Separator } from "../ui/separator";


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
    
    const hasChanges = 
        username !== (userData?.username || "") || 
        bio !== (userData?.bio || "") ||
        age !== (userData?.age || undefined) ||
        city !== (userData?.city || "") ||
        country !== (userData?.country || "") ||
        gender !== (userData?.gender || undefined) ||
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
            const userDocUpdates: { [key: string]: any } = {};
            const authProfileUpdates: { displayName?: string; photoURL?: string } = {};
            const postUpdates: { [key: string]: any } = {};
    
            if (newAvatar) {
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.png`);
                const snapshot = await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(snapshot.ref);
                userDocUpdates.photoURL = finalPhotoURL;
                authProfileUpdates.photoURL = finalPhotoURL;
                postUpdates.userAvatar = finalPhotoURL;
            }
    
            if (username !== userData?.username) {
                 if (!username.startsWith('@') || !/^@\w+$/.test(username)) {
                    toast({ variant: "destructive", title: "Geçersiz Kullanıcı Adı", description: "Kullanıcı adı '@' ile başlamalı ve sadece harf, rakam veya alt çizgi içermelidir." });
                    setIsSaving(false); return;
                }
                const existingUser = await findUserByUsername(username);
                if (existingUser && existingUser.uid !== user.uid) {
                    toast({ variant: "destructive", title: "Kullanıcı Adı Alınmış", description: "Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor." });
                    setIsSaving(false); return;
                }
                userDocUpdates.username = username;
                authProfileUpdates.displayName = username;
                postUpdates.username = username;
            }

            if (selectedAvatarFrame !== (userData?.selectedAvatarFrame || "")) {
                userDocUpdates.selectedAvatarFrame = selectedAvatarFrame;
                postUpdates.userAvatarFrame = selectedAvatarFrame;
            }

            if (bio !== userData?.bio) userDocUpdates.bio = bio;
            if (age !== userData?.age) userDocUpdates.age = Number(age);
            if (city !== userData?.city) userDocUpdates.city = city;
            if (country !== userData?.country) userDocUpdates.country = country;
            if (gender !== userData?.gender) userDocUpdates.gender = gender;
            if (privateProfile !== userData?.privateProfile) userDocUpdates.privateProfile = privateProfile;
            if (acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) userDocUpdates.acceptsFollowRequests = acceptsFollowRequests;
            if (showOnlineStatus !== (userData?.showOnlineStatus ?? true)) userDocUpdates.showOnlineStatus = showOnlineStatus;
            if (selectedBubble !== (userData?.selectedBubble || "")) userDocUpdates.selectedBubble = selectedBubble;

            if (Object.keys(userDocUpdates).length > 0) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, userDocUpdates);
            }
    
            if (Object.keys(authProfileUpdates).length > 0) {
                 await updateProfile(auth.currentUser, authProfileUpdates);
            }

            if (Object.keys(postUpdates).length > 0) {
                await updateUserPosts(user.uid, postUpdates);
            }

            const commentUpdates: { userAvatar?: string; userAvatarFrame?: string; username?: string } = {};
            if (postUpdates.userAvatar) commentUpdates.userAvatar = postUpdates.userAvatar;
            if (postUpdates.userAvatarFrame) commentUpdates.userAvatarFrame = postUpdates.userAvatarFrame;
            if (postUpdates.username) commentUpdates.username = postUpdates.username;

            if (Object.keys(commentUpdates).length > 0) {
                await updateUserComments(user.uid, commentUpdates);
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
            <Card className="w-full max-w-2xl shadow-xl rounded-3xl border-0 overflow-hidden">
                <div className="p-4 bg-muted/30">
                     <div className="flex items-center gap-4">
                         <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                        <button
                            type="button"
                            onClick={handleAvatarClick}
                            className="relative group rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            aria-label="Profil fotoğrafını değiştir"
                        >
                            <div className={cn("avatar-frame-wrapper", selectedAvatarFrame)}>
                                <Avatar className="relative z-[1] h-20 w-20 border-4 border-white shadow-lg transition-all group-hover:brightness-90">
                                    <AvatarImage src={newAvatar || userData.photoURL || undefined} />
                                    <AvatarFallback className="text-3xl bg-primary/20">{username?.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200">
                                <Camera className="h-8 w-8" />
                            </div>
                        </button>
                        <div className="flex-1">
                             <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold">{userData?.username || user.displayName}</h1>
                                {isAdmin && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger><BadgeCheck className="h-6 w-6 text-primary fill-primary/30" /></TooltipTrigger>
                                            <TooltipContent><p>Yönetici Hesabı</p></TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <p className="text-sm text-muted-foreground">{userData?.email}</p>
                        </div>
                        <Button onClick={handleLogout} variant="ghost" size="icon" className="rounded-full"><LogOut className="h-5 w-5"/></Button>
                     </div>
                </div>

                <Tabs defaultValue="profile" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 rounded-none border-b bg-muted/20">
                         <TabsTrigger value="profile"><UserIcon className="mr-1 h-4 w-4"/> Profil</TabsTrigger>
                         <TabsTrigger value="appearance"><Palette className="mr-1 h-4 w-4"/> Görünüm</TabsTrigger>
                         <TabsTrigger value="privacy"><Lock className="mr-1 h-4 w-4"/> Gizlilik</TabsTrigger>
                         <TabsTrigger value="extras"><Sparkles className="mr-1 h-4 w-4"/> Ekstra</TabsTrigger>
                    </TabsList>

                    <TabsContent value="profile" className="p-6 space-y-4">
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
                    </TabsContent>

                    <TabsContent value="appearance" className="p-6 space-y-6">
                        <div>
                            <Label className="text-base font-medium">Tema</Label>
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
                            <Label className="text-base font-medium">Sohbet Baloncuğu</Label>
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
                            <Label className="text-base font-medium">Avatar Çerçevesi</Label>
                             <div className="grid grid-cols-3 gap-2 pt-2">
                                {avatarFrameOptions.map(option => (
                                    <div key={option.id} onClick={() => setSelectedAvatarFrame(option.id)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent", selectedAvatarFrame === option.id ? "border-primary" : "")}>
                                        <div className={cn("avatar-frame-wrapper h-12 w-12", option.id)}><Avatar className="relative z-[1] h-full w-full bg-muted" /></div>
                                        <span className="text-xs font-bold text-center">{option.name}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="privacy" className="p-6 space-y-4">
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
                    </TabsContent>
                    
                     <TabsContent value="extras" className="p-6 space-y-6">
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
                         <Separator />
                        <div>
                             <div className="flex items-center gap-3 mb-2">
                                <Eye className="h-5 w-5 text-muted-foreground" />
                                <Label className="text-base font-semibold">{t('profile_viewers')}</Label>
                            </div>
                             <ProfileViewerList />
                        </div>
                         <Separator />
                         <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Globe className="h-5 w-5 text-muted-foreground" />
                                <Label className="text-base font-semibold">{t('language_settings')}</Label>
                            </div>
                             <LanguageSwitcher />
                        </div>
                     </TabsContent>
                </Tabs>
                
                <AnimatePresence>
                {hasChanges && (
                    <motion.div
                        initial={{ y: "100%", opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: "100%", opacity: 0 }}
                        className="sticky bottom-0 z-10 p-4 bg-background/95 backdrop-blur-sm border-t"
                    >
                        <div className="flex justify-between items-center max-w-2xl mx-auto">
                            <p className="text-sm font-semibold">Kaydedilmemiş değişiklikleriniz var.</p>
                            <Button onClick={handleSaveChanges} disabled={isSaving}>
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t('save_changes')}
                            </Button>
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
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
