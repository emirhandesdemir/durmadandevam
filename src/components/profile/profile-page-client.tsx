// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Camera, Gift, Copy, Users, Globe, User as UserIcon, Shield, Crown, Sun, Moon, Laptop, KeyRound, ShieldOff, Bookmark } from "lucide-react";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Switch } from "../ui/switch";
import { useState, useRef, useEffect, useMemo } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { updateProfile, sendPasswordResetEmail } from "firebase/auth";
import ImageCropperDialog from "@/components/common/ImageCropperDialog";
import { cn } from "@/lib/utils";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { Textarea } from "../ui/textarea";
import { useRouter } from 'next/navigation';
import { findUserByUsername, updateUserPosts, updateUserComments } from "@/lib/actions/userActions";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import Link from 'next/link';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import BlockedUsersDialog from "./BlockedUsersDialog";


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
    
    // States for user data
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(true);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [selectedBubble, setSelectedBubble] = useState("");
    const [selectedAvatarFrame, setSelectedAvatarFrame] = useState("");
    
    // States for component logic
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inviteLink, setInviteLink] = useState("");
    const [isResetPasswordConfirmOpen, setIsResetPasswordConfirmOpen] = useState(false);
    const [isBlockedUsersDialogOpen, setIsBlockedUsersDialogOpen] = useState(false);
    
    const isPremium = userData?.premiumUntil && userData.premiumUntil.toDate() > new Date();

    // Populate state from userData
    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
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
    
    const hasChanges = useMemo(() => {
        if (!userData) return false;
        return (
            username !== (userData.username || "") || 
            bio !== (userData.bio || "") ||
            privateProfile !== (userData.privateProfile || false) || 
            acceptsFollowRequests !== (userData.acceptsFollowRequests ?? true) ||
            showOnlineStatus !== (userData.showOnlineStatus ?? true) ||
            newAvatar !== null || 
            selectedBubble !== (userData.selectedBubble || "") || 
            selectedAvatarFrame !== (userData.selectedAvatarFrame || "")
        );
    }, [username, bio, privateProfile, acceptsFollowRequests, showOnlineStatus, newAvatar, selectedBubble, selectedAvatarFrame, userData]);
    
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
            if (bio !== (userData?.bio || "")) userDocUpdates.bio = bio;
            if (privateProfile !== (userData?.privateProfile || false)) userDocUpdates.privateProfile = privateProfile;
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
                }
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
    
    if (loading || !user || !userData) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(inviteLink);
        toast({ description: "Davet linki kopyalandı!" });
    };

    const handlePasswordReset = async () => {
        setIsResetPasswordConfirmOpen(false);
        if (!user?.email) {
            toast({ variant: 'destructive', description: "E-posta adresiniz bulunamadı." });
            return;
        }
        try {
            await sendPasswordResetEmail(auth, user.email);
            toast({ title: 'E-posta Gönderildi', description: 'Şifrenizi sıfırlamak için lütfen e-posta kutunuzu kontrol edin.' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Hata', description: error.message });
        }
    };

    return (
        <>
            <div className="w-full max-w-4xl mx-auto space-y-4 pb-24">
                <div className="flex flex-col items-center gap-4 pt-4">
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

                <Accordion type="multiple" defaultValue={['item-1']} className="w-full space-y-4">
                    <Card as={AccordionItem} value="item-1">
                        <AccordionTrigger className="p-6">
                            <CardHeader className="p-0 text-left">
                                <div className="flex items-center gap-3">
                                    <UserIcon className="h-6 w-6 text-primary" />
                                    <CardTitle>Profil Bilgileri</CardTitle>
                                </div>
                                <CardDescription>Profilinizde görünecek herkese açık bilgiler.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="username">Kullanıcı Adı</Label>
                                    <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="bio">Biyografi</Label>
                                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" maxLength={150} />
                                </div>
                            </div>
                        </AccordionContent>
                    </Card>

                    <Card as={AccordionItem} value="item-2">
                        <AccordionTrigger className="p-6">
                            <CardHeader className="p-0 text-left">
                                <div className="flex items-center gap-3">
                                    <Palette className="h-6 w-6 text-primary" />
                                    <CardTitle>Görünüm Ayarları</CardTitle>
                                </div>
                                <CardDescription>Uygulamanın ve profilinizin görünümünü özelleştirin.</CardDescription>
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

                    <Card as={AccordionItem} value="item-3">
                         <AccordionTrigger className="p-6">
                            <CardHeader className="p-0 text-left">
                                <div className="flex items-center gap-3">
                                    <Lock className="h-6 w-6 text-primary" />
                                    <CardTitle>Gizlilik ve Güvenlik</CardTitle>
                                </div>
                                <CardDescription>Hesabınızın gizliliğini ve kimlerin sizinle etkileşim kurabileceğini yönetin.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                         <AccordionContent className="p-6 pt-0">
                            <div className="space-y-4">
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
                                        <p className="text-xs text-muted-foreground">Kapalıysa, diğer kullanıcılar çevrimiçi olduğunuzu göremez.</p>
                                    </div>
                                    <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                                </div>
                                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsBlockedUsersDialogOpen(true)}>
                                    <ShieldOff className="h-4 w-4" /> Engellenen Hesaplar
                                </Button>
                                <Button variant="outline" className="w-full justify-start gap-2" onClick={() => setIsResetPasswordConfirmOpen(true)}>
                                    <KeyRound className="h-4 w-4" /> Şifremi Sıfırla
                                </Button>
                            </div>
                        </AccordionContent>
                    </Card>

                    <Card as={AccordionItem} value="item-4">
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
                        <CardContent>
                            <Button variant="destructive" onClick={handleLogout}>
                                <LogOut className="mr-2 h-4 w-4" />Çıkış Yap
                            </Button>
                        </CardContent>
                    </Card>
                </Accordion>
            </div>

            <>
            {hasChanges && (
                <div
                    className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/80 backdrop-blur-sm border-t"
                >
                    <div className="container mx-auto flex justify-between items-center max-w-4xl">
                        <p className="text-sm font-semibold">Kaydedilmemiş değişiklikleriniz var.</p>
                        <Button onClick={handleSaveChanges} disabled={isSaving}>
                            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {t('save_changes')}
                        </Button>
                    </div>
                </div>
            )}
            </>

            <ImageCropperDialog 
              isOpen={!!imageToCrop} 
              setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)} 
              imageSrc={imageToCrop} 
              aspectRatio={1} 
              onCropComplete={handleCropComplete} 
              circularCrop={true}
            />
            
             <AlertDialog open={isResetPasswordConfirmOpen} onOpenChange={setIsResetPasswordConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Şifre Sıfırlama E-postası Gönderilsin mi?</AlertDialogTitle>
                        <AlertDialogDescription>
                           <strong className="text-foreground">{user.email}</strong> adresine bir şifre sıfırlama bağlantısı göndereceğiz. Devam etmek istiyor musunuz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePasswordReset}>Evet, Gönder</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            <BlockedUsersDialog
                isOpen={isBlockedUsersDialogOpen}
                onOpenChange={setIsBlockedUsersDialogOpen}
                blockedUserIds={userData.blockedUsers || []}
            />
        </>
    );
}
