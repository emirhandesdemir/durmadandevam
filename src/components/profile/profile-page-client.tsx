// src/components/profile/profile-page-client.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Palette, Loader2, Sparkles, Lock, Camera, Gift, Copy, Users, Globe, User as UserIcon, Shield } from "lucide-react";
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
import { findUserByUsername } from "@/lib/actions/userActions";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "../common/LanguageSwitcher";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import ProfileViewerList from "./ProfileViewerList";

export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    const { t } = useTranslation();
    
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [inviteLink, setInviteLink] = useState("");

    // Populate state from userData
    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setBio(userData.bio || "");
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
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
            newAvatar !== null
        );
    }, [username, bio, privateProfile, acceptsFollowRequests, newAvatar, userData]);
    
    const handleAvatarClick = () => { fileInputRef.current?.click(); };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
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
            const userDocRef = doc(db, 'users', user.uid);
            const updates: { [key: string]: any } = {};
            
            // Check for username change and availability
            if (username !== userData?.username) {
                if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
                    toast({ variant: "destructive", title: "Geçersiz Kullanıcı Adı", description: "Kullanıcı adı 3-20 karakter uzunluğunda olmalı ve sadece harf, rakam veya alt çizgi içermelidir." });
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
                await updateProfile(auth.currentUser, { displayName: username });
            }
    
            // Check for bio change
            if (bio !== userData?.bio) {
                updates.bio = bio;
            }
    
            // Check for avatar change
            if (newAvatar) {
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.jpg`);
                await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(newAvatarRef);
                updates.photoURL = finalPhotoURL;
                await updateProfile(auth.currentUser, { photoURL: finalPhotoURL });
            }
            
            // Privacy settings
            if(privateProfile !== userData?.privateProfile) updates.privateProfile = privateProfile;
            if(acceptsFollowRequests !== userData?.acceptsFollowRequests) updates.acceptsFollowRequests = acceptsFollowRequests;
    
            if (Object.keys(updates).length > 0) {
                await updateDoc(userDocRef, updates);
            }
    
            toast({
                title: "Başarılı!",
                description: "Profiliniz başarıyla güncellendi.",
            });
            setNewAvatar(null); // Reset avatar change state after saving
    
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
                    </CardContent>
                </Card>

                <Accordion type="multiple" className="w-full space-y-4">
                    <Card as={AccordionItem} value="item-1">
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
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Sun className="h-4 w-4" />Aydınlık
                                            </div>
                                        </Label>
                                        <Label htmlFor="dark-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'dark' && "border-primary")}>
                                            <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Moon className="h-4 w-4" />Karanlık
                                            </div>
                                        </Label>
                                        <Label htmlFor="system-theme" className={cn("flex flex-col items-center justify-center rounded-lg border-2 p-3 hover:bg-accent hover:text-accent-foreground cursor-pointer", theme === 'system' && "border-primary")}>
                                            <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                                            <div className="flex items-center gap-2 font-semibold">
                                                <Laptop className="h-4 w-4" />Sistem
                                            </div>
                                        </Label>
                                    </RadioGroup>
                                </div>
                            </div>
                        </AccordionContent>
                    </Card>

                    <Card as={AccordionItem} value="item-2">
                         <AccordionTrigger className="p-6">
                            <CardHeader className="p-0 text-left">
                                <div className="flex items-center gap-3">
                                    <Lock className="h-6 w-6 text-primary" />
                                    <CardTitle>Gizlilik Ayarları</CardTitle>
                                </div>
                                <CardDescription>Hesabınızın gizliliğini ve kimlerin sizinle etkileşim kurabileceğini yönetin.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                         <AccordionContent className="p-6 pt-0">
                             <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="privacy-mode">Gizli Hesap</Label>
                                    <p className="text-xs text-muted-foreground">Aktif olduğunda, sadece onayladığın kişiler seni takip edebilir.</p>
                                </div>
                                <Switch id="privacy-mode" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                            </div>
                             <div className="flex items-center justify-between mt-4">
                                <div>
                                    <Label htmlFor="requests-mode" className={cn("transition-colors", !privateProfile && "text-muted-foreground/50")}>Takip İsteklerine İzin Ver</Label>
                                    <p className={cn("text-xs text-muted-foreground transition-colors", !privateProfile && "text-muted-foreground/50")}>Kapalıysa, kimse size takip isteği gönderemez.</p>
                                </div>
                                <Switch id="requests-mode" checked={acceptsFollowRequests} onCheckedChange={setAcceptsFollowRequests} disabled={!privateProfile}/>
                            </div>
                        </AccordionContent>
                    </Card>
                    
                    <Card as={AccordionItem} value="item-3">
                        <AccordionTrigger className="p-6">
                            <CardHeader className="p-0 text-left">
                                <div className="flex items-center gap-3">
                                    <Users className="h-6 w-6 text-primary" />
                                    <CardTitle>{t('profile_viewers')}</CardTitle>
                                </div>
                                <CardDescription>Son zamanlarda profilini kimlerin görüntülediğini gör.</CardDescription>
                            </CardHeader>
                        </AccordionTrigger>
                        <AccordionContent className="p-6 pt-0">
                           <ProfileViewerList />
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
                    <div className="container mx-auto flex justify-between items-center max-w-2xl">
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
        </>
    );
}
