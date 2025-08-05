// src/app/(main)/profile/feed-settings/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, Eye, Heart, Users, Video } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import { updateUserProfile } from "@/lib/actions/userActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export default function FeedSettingsPage() {
    const { userData, loading, refreshUserData } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    
    // Local state for optimistic UI updates
    const [showOnlyFollowing, setShowOnlyFollowing] = useState(userData?.feedSettings?.showOnlyFollowing ?? false);
    const [hideLikedPosts, setHideLikedPosts] = useState(userData?.feedSettings?.hideLikedPosts ?? false);
    const [hideVideos, setHideVideos] = useState(userData?.feedSettings?.hideVideos ?? false);

    useEffect(() => {
        if (userData?.feedSettings) {
            setShowOnlyFollowing(userData.feedSettings.showOnlyFollowing ?? false);
            setHideLikedPosts(userData.feedSettings.hideLikedPosts ?? false);
            setHideVideos(userData.feedSettings.hideVideos ?? false);
        }
    }, [userData]);
    
    const handleSave = async () => {
        if (!userData) return;
        setIsSaving(true);
        try {
            await updateUserProfile({
                userId: userData.uid,
                feedSettings: {
                    showOnlyFollowing,
                    hideLikedPosts,
                    hideVideos,
                },
            });
            await refreshUserData();
            toast({ description: "Akış ayarlarınız kaydedildi." });
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
                        <CardTitle>Ana Akış Ayarları</CardTitle>
                        <CardDescription>Ana sayfa akışınızda göreceğiniz içerikleri kişiselleştirin.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="show-following" className="font-semibold flex items-center gap-2"><Users className="h-4 w-4"/> Sadece Takip Ettiklerim</Label>
                                <p className="text-xs text-muted-foreground pl-6">Etkinleştirildiğinde, ana akışta sadece takip ettiğiniz kişilerin gönderileri görünür.</p>
                            </div>
                            <Switch id="show-following" checked={showOnlyFollowing} onCheckedChange={setShowOnlyFollowing} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="hide-liked" className="font-semibold flex items-center gap-2"><Heart className="h-4 w-4"/> Beğenilenleri Gizle</Label>
                                <p className="text-xs text-muted-foreground pl-6">Daha önce beğendiğiniz gönderileri ana akışınızda gizler.</p>
                            </div>
                            <Switch id="hide-liked" checked={hideLikedPosts} onCheckedChange={setHideLikedPosts} />
                        </div>
                         <div className="flex items-center justify-between">
                            <div>
                                <Label htmlFor="hide-videos" className="font-semibold flex items-center gap-2"><Video className="h-4 w-4"/> Videoları Gizle</Label>
                                <p className="text-xs text-muted-foreground pl-6">Video içeren gönderileri ana akışınızdan kaldırır.</p>
                            </div>
                            <Switch id="hide-videos" checked={hideVideos} onCheckedChange={setHideVideos} />
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Gizlenen İçerikler</CardTitle>
                         <CardDescription>"İlgilenmiyorum" olarak işaretlediğiniz gönderileri buradan yönetebilirsiniz.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button asChild variant="secondary">
                            <Link href="/profile/hidden-content/manage">
                                <Eye className="mr-2 h-4 w-4"/> Gizlenen Gönderileri Yönet
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};
