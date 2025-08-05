// src/app/(main)/profile/privacy/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Lock, UserPlus, Eye, Users } from "lucide-react";
import { useState, useEffect } from "react";
import Link from 'next/link';
import { updateUserProfile } from "@/lib/actions/userActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";


export default function PrivacySettingsPage() {
    const { userData, loading, refreshUserData } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Local state for optimistic UI updates
    const [privateProfile, setPrivateProfile] = useState(userData?.privateProfile ?? false);
    const [acceptsFollowRequests, setAcceptsFollowRequests] = useState(userData?.acceptsFollowRequests ?? true);
    const [showOnlineStatus, setShowOnlineStatus] = useState(userData?.showOnlineStatus ?? true);
    const [showActiveRoom, setShowActiveRoom] = useState(userData?.showActiveRoom ?? true);

    useEffect(() => {
        if (userData) {
            setPrivateProfile(userData.privateProfile ?? false);
            setAcceptsFollowRequests(userData.acceptsFollowRequests ?? true);
            setShowOnlineStatus(userData.showOnlineStatus ?? true);
            setShowActiveRoom(userData.showActiveRoom ?? true);
        }
    }, [userData]);

    const handleSave = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            await updateUserProfile({
                userId: userData.uid,
                privateProfile,
                acceptsFollowRequests,
                showOnlineStatus,
                showActiveRoom,
            });
            await refreshUserData();
            toast({ description: "Gizlilik ayarlarınız kaydedildi." });
        } catch (e: any) {
            toast({ variant: 'destructive', description: "Ayarlar kaydedilemedi." });
        } finally {
            setIsSaving(false);
        }
    };

    if (loading || !userData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile"><ChevronLeft className="mr-2 h-4 w-4"/> Geri</Link>
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Kaydet
                </Button>
            </header>
            <div className="p-4 space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Etkileşimler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="private-profile" className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4"/> Gizli Hesap</Label>
                                <p className="text-xs text-muted-foreground pl-6">Etkinleştirildiğinde, sadece takipçilerin gönderilerini ve profilini görebilir.</p>
                            </div>
                            <Switch id="private-profile" checked={privateProfile} onCheckedChange={setPrivateProfile} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="follow-requests" className="font-semibold flex items-center gap-2"><UserPlus className="h-4 w-4"/> Takip İsteklerini Kabul Et</Label>
                                <p className="text-xs text-muted-foreground pl-6">Devre dışı bırakırsan kimse sana takip isteği gönderemez.</p>
                            </div>
                            <Switch id="follow-requests" checked={acceptsFollowRequests} onCheckedChange={setAcceptsFollowRequests} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="online-status" className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4"/> Aktivite Durumu</Label>
                                <p className="text-xs text-muted-foreground pl-6">Çevrimiçi olup olmadığını diğer kullanıcılardan gizle.</p>
                            </div>
                            <Switch id="online-status" checked={showOnlineStatus} onCheckedChange={setShowOnlineStatus} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="show-active-room" className="font-semibold flex items-center gap-2"><Users className="h-4 w-4"/> Aktif Oda Durumunu Göster</Label>
                                <p className="text-xs text-muted-foreground pl-6">Bir odadayken bunun profilinizde görünmesine izin verin.</p>
                            </div>
                            <Switch id="show-active-room" checked={showActiveRoom} onCheckedChange={setShowActiveRoom} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
