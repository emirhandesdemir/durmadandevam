// src/app/(main)/profile/sessions/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, LogOut, Laptop, Globe, Server } from "lucide-react";
import { useState } from "react";
import Link from 'next/link';
import { revokeAllSessions } from "@/lib/actions/userActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { auth } from "@/lib/firebase";


export default function SessionsPage() {
    const { user, userData, loading } = useAuth();
    const { toast } = useToast();
    const [isRevoking, setIsRevoking] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    
    const handleRevokeAll = async () => {
        if (!user) return;
        setIsRevoking(true);
        setShowRevokeConfirm(false);
        try {
            await revokeAllSessions(user.uid);
            toast({
                title: "Başarılı!",
                description: "Diğer tüm cihazlardaki oturumlarınız sonlandırıldı. Güvenlik nedeniyle bu cihazdan da çıkış yapılıyor.",
                duration: 6000,
            });
            setTimeout(() => auth.signOut(), 3000);
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Hata", description: error.message });
             setIsRevoking(false);
        }
    };
    
    if (loading || !userData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    const sessions = Object.entries(userData.sessions || {}).map(([key, value]) => ({ id: key, ...value }));
    // Sort so the current session is first
    sessions.sort((a, b) => {
        if (a.id === 'current') return -1;
        if (b.id === 'current') return 1;
        return b.lastSeen.toDate().getTime() - a.lastSeen.toDate().getTime();
    });

    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile/security"><ChevronLeft className="mr-2 h-4 w-4"/> Geri</Link>
                </Button>
                 <h1 className="text-lg font-semibold">Oturum Yönetimi</h1>
                 <div className="w-10"></div>
            </header>
            <div className="p-4 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>Aktif Oturumlar</CardTitle>
                        <CardDescription>
                             Hesabınıza giriş yapılmış olan cihazların listesi.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessions.map(session => (
                            <div key={session.id} className="p-3 rounded-lg border bg-muted/50">
                                <div className="flex items-center justify-between">
                                    <p className="font-semibold text-sm flex items-center gap-2">
                                        <Laptop className="h-4 w-4"/> {session.userAgent || 'Bilinmeyen Cihaz'}
                                    </p>
                                     {session.id === 'current' && <span className="text-xs font-bold text-green-600">MEVCUT CİHAZ</span>}
                                </div>
                                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                                    <p className="flex items-center gap-2"><Globe className="h-3 w-3"/> IP: {session.ipAddress || 'Bilinmiyor'}</p>
                                    <p>Son Aktif: {formatDistanceToNow(session.lastSeen.toDate(), { addSuffix: true, locale: tr })}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                     <CardFooter>
                        <Button onClick={() => setShowRevokeConfirm(true)} disabled={isRevoking} variant="destructive">
                            {isRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
                            Diğer Tüm Oturumları Kapat
                        </Button>
                    </CardFooter>
                </Card>
            </div>
            <AlertDialog open={showRevokeConfirm} onOpenChange={setShowRevokeConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tüm Oturumları Kapat?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bu işlem, mevcut oturumunuz hariç tüm cihazlardaki oturumlarınızı sonlandıracaktır. Devam etmek istediğinizden emin misiniz?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevokeAll} className="bg-destructive hover:bg-destructive/90">
                            Evet, Kapat
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};
