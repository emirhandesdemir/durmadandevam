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
import { LogOut, Edit, Shield, BadgeCheck, Palette, Sun, Moon, Laptop, Loader2, Sparkles, Headphones, Gem, MessageCircle, Lock, Unlock } from "lucide-react";
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
import { toggleProfilePrivacy } from "@/lib/actions/followActions";


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
];


export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();

    // State'ler
    const [username, setUsername] = useState("");
    const [privateProfile, setPrivateProfile] = useState(false);
    const [newAvatar, setNewAvatar] = useState<string | null>(null);
    const [imageToCrop, setImageToCrop] = useState<string | null>(null);
    const [selectedBubble, setSelectedBubble] = useState("");
    const [selectedAvatarFrame, setSelectedAvatarFrame] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // userData'dan gelen verilerle state'leri başlat
    useEffect(() => {
        if (userData) {
            setUsername(userData.username || "");
            setPrivateProfile(userData.privateProfile || false);
            setSelectedBubble(userData.selectedBubble || "");
            setSelectedAvatarFrame(userData.selectedAvatarFrame || "");
        }
    }, [userData]);
    
    // Değişiklik olup olmadığını kontrol et
    const hasChanges = 
        username !== (userData?.username || "") || 
        privateProfile !== (userData?.privateProfile || false) || 
        newAvatar !== null || 
        selectedBubble !== (userData?.selectedBubble || "") || 
        selectedAvatarFrame !== (userData?.selectedAvatarFrame || "");

    const diamondCount = userData?.diamonds ?? 0;
    
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
        setNewAvatar(croppedDataUrl);
        setImageToCrop(null); 
    };

    const handleSaveChanges = async () => {
        if (!user || !hasChanges || !auth.currentUser) return;
    
        setIsSaving(true);
        try {
            const updates: { [key: string]: any } = {};
            let authUpdates: { displayName?: string, photoURL?: string } = {};
    
            if (newAvatar) {
                const storageRef = ref(storage, `avatars/${user.uid}`);
                const snapshot = await uploadString(storageRef, newAvatar, 'data_url');
                const finalPhotoURL = await getDownloadURL(snapshot.ref);
                updates.photoURL = finalPhotoURL;
                authUpdates.photoURL = finalPhotoURL;
            }
    
            if (username !== userData?.username) {
                updates.username = username;
                authUpdates.displayName = username;
            }
             if (privateProfile !== userData?.privateProfile) {
                updates.privateProfile = privateProfile;
            }
            if (selectedBubble !== (userData?.selectedBubble || "")) {
                updates.selectedBubble = selectedBubble;
            }
            if (selectedAvatarFrame !== (userData?.selectedAvatarFrame || "")) {
                updates.selectedAvatarFrame = selectedAvatarFrame;
            }
    
            if (Object.keys(updates).length > 0) {
                const userDocRef = doc(db, 'users', user.uid);
                await updateDoc(userDocRef, updates);
            }
    
            if (Object.keys(authUpdates).length > 0) {
                await updateProfile(auth.currentUser, authUpdates);
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

    const isAdmin = userData?.role === 'admin';

    return (
        <>
            <Card className="w-full max-w-2xl shadow-xl rounded-3xl border-0">
                <CardHeader className="items-center text-center pt-8">
                     <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <div className="relative">
                        <div className={cn("avatar-frame-wrapper p-2", selectedAvatarFrame)}>
                            <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                                <AvatarImage src={newAvatar || user.photoURL || undefined} />
                                <AvatarFallback className="text-5xl bg-primary/20">{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                            </Avatar>
                        </div>
                        <Button size="icon" variant="outline" className="absolute bottom-2 right-2 rounded-full h-10 w-10 border-2 border-background bg-card" onClick={handleAvatarClick}>
                            <Edit className="h-5 w-5" />
                        </Button>
                    </div>
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
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="username">Kullanıcı Adı</Label>
                            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-full" />
                        </div>
                        <div className="flex items-center justify-between rounded-full border p-2 pl-4">
                            <div className="flex items-center gap-2">
                                {privateProfile ? <Lock className="text-destructive"/> : <Unlock className="text-green-500"/>}
                                <Label htmlFor="privacy-mode" className="font-semibold">Gizli Profil</Label>
                            </div>
                            <Switch id="privacy-mode" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                        </div>
                    </div>
                    <Separator />
                    
                    <Accordion type="single" collapsible className="w-full">
                         <AccordionItem value="bubbles">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><MessageCircle className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Sohbet Baloncuğu</span></div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="grid grid-cols-3 gap-2 pt-2">
                                 {bubbleOptions.map(option => (
                                    <div key={option.id} onClick={() => setSelectedBubble(option.id)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent", selectedBubble === option.id ? "border-primary" : "")}>
                                        <div className="relative h-12 w-12 bg-muted rounded-full">
                                            {option.id !== "" && (<div className={`bubble-wrapper ${option.id}`}>{Array.from({ length: 5 }).map((_, i) => <div key={i} className="bubble" />)}</div>)}
                                        </div>
                                        <span className="text-xs font-bold text-center">{option.name}</span>
                                    </div>
                                 ))}
                               </div>
                            </AccordionContent>
                        </AccordionItem>
                         <AccordionItem value="avatar-frames">
                            <AccordionTrigger>
                                <div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-muted-foreground" /><span className="font-semibold">Avatar Çerçevesi</span></div>
                            </AccordionTrigger>
                            <AccordionContent>
                               <div className="grid grid-cols-3 gap-2 pt-2">
                                 {avatarFrameOptions.map(option => (
                                    <div key={option.id} onClick={() => setSelectedAvatarFrame(option.id)} className={cn("flex flex-col items-center justify-center gap-2 rounded-lg border-2 cursor-pointer p-2 aspect-square hover:bg-accent", selectedAvatarFrame === option.id ? "border-primary" : "")}>
                                        <div className={cn("avatar-frame-wrapper h-12 w-12", option.id)}><Avatar className="h-full w-full bg-muted" /></div>
                                        <span className="text-xs font-bold text-center">{option.name}</span>
                                    </div>
                                 ))}
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
