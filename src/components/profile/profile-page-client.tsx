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
import { LogOut, Edit, Shield, BadgeCheck, Palette, Sun, Moon, Laptop, Loader2, Sparkles, Lock, Eye, Camera, Settings, Gift, Copy } from "lucide-react";
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
import { ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
import ProfileViewerList from "./ProfileViewerList";
import { Textarea } from "../ui/textarea";
import { useRouter } from 'next/navigation';

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
    
    const [username, setUsername] = useState("");
    const [bio, setBio] = useState("");
    const [privateProfile, setPrivateProfile] = useState(false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(true);
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
            setPrivateProfile(userData.privateProfile || false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setSelectedBubble(userData.selectedBubble || "");
            setSelectedAvatarFrame(userData.selectedAvatarFrame || "");
        }
        if (user) {
            setInviteLink(`${window.location.origin}/signup?ref=${user.uid}`);
        }
    }, [userData, user]);
    
    const hasChanges = 
        username !== (userData?.username || "") || 
        bio !== (userData?.bio || "") ||
        privateProfile !== (userData?.privateProfile || false) || 
        acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true) ||
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
            reader.readAsDataURL(file);
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
                const newAvatarRef = ref(storage, `upload/avatars/${user.uid}/avatar.jpg`);
                const snapshot = await uploadString(newAvatarRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(snapshot.ref);
                
                updates.photoURL = finalPhotoURL;
                authProfileUpdates.photoURL = finalPhotoURL;
            }
    
            if (username !== userData?.username) {
                updates.username = username;
                authProfileUpdates.displayName = username;
            }
            if (bio !== userData?.bio) updates.bio = bio;
            if (privateProfile !== userData?.privateProfile) updates.privateProfile = privateProfile;
            if (acceptsFollowRequests !== (userData?.acceptsFollowRequests ?? true)) updates.acceptsFollowRequests = acceptsFollowRequests;
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
            router.refresh(); // Sayfayı yenileyerek AuthContext'in güncel veriyi çekmesini sağla
    
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
                    <CardDescription>{user.email}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 px-6">
                    <div className="space-y-2">
                        <Label htmlFor="username">Kullanıcı Adı</Label>
                        <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-full" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio">Biyografi</Label>
                        <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Kendini anlat..." className="rounded-xl" />
                    </div>
                    <Separator />
                    
                    <Accordion type="single" collapsible className="w-full">
                         <AccordionItem value="privacy">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Lock className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Gizlilik Ayarları</span></div>
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
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="invite">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Gift className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Davet Sistemi</span></div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Bu linki arkadaşlarınla paylaş. Senin linkinle kayıt olan her arkadaşın için <strong>10 elmas</strong> kazan!
                                </p>
                                <div className="flex gap-2">
                                    <Input value={inviteLink} readOnly className="text-sm" />
                                    <Button onClick={copyToClipboard} variant="outline" size="icon"><Copy className="h-4 w-4" /></Button>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="viewers">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Eye className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Profilime Bakanlar</span></div>
                            </AccordionTrigger>
                            <AccordionContent>
                                <ProfileViewerList />
                            </AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="appearance">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Palette className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Görünüm Ayarları</span></div>
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
                    <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto rounded-full"><LogOut className="mr-2" />Çıkış Yap</Button>
                    {isAdmin && (
                        <Button asChild className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700"><Link href="/admin/dashboard"><Shield className="mr-2" />Yönetim Paneli</Link></Button>
                    )}
                    <Button onClick={handleSaveChanges} className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={!hasChanges || isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Değişiklikleri Kaydet
                    </Button>
                </CardFooter>
            </Card>
            <ImageCropperDialog isOpen={!!imageToCrop} setIsOpen={(isOpen) => !isOpen && setImageToCrop(null)} imageSrc={imageToCrop} aspectRatio={1} onCropComplete={handleCropComplete} />
        </>
    );
}
