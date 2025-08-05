// src/app/(main)/profile/security/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ChevronLeft, KeyRound, MailWarning, MailCheck, ShieldCheck, Server, LogOut } from "lucide-react";
import { useState, useCallback } from "react";
import Link from 'next/link';
import { updateUserProfile, revokeAllSessions } from "@/lib/actions/userActions";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { sendEmailVerification, updateEmail, reauthenticateWithCredential, EmailAuthProvider, verifyBeforeUpdateEmail } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


export default function SecuritySettingsPage() {
    const { user, userData, loading, refreshUserData } = useAuth();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isChangingEmail, setIsChangingEmail] = useState(false);
    const [isRevoking, setIsRevoking] = useState(false);
    const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
    
    const [newEmail, setNewEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSendVerification = async () => {
        if (!user || userData?.emailVerified) return;
        setIsVerifying(true);
        try {
            await sendEmailVerification(user);
            toast({
                title: "Doğrulama E-postası Gönderildi",
                description: "Lütfen e-posta kutunuzu kontrol edin ve linke tıklayarak hesabınızı doğrulayın.",
                duration: 7000,
            });
        } catch (error: any) {
             toast({
                variant: 'destructive',
                title: "Hata",
                description: `E-posta gönderilemedi: ${error.message}`
            });
        } finally {
            setIsVerifying(false);
        }
    };
    
    const handleChangeEmail = async () => {
        if (!user || !newEmail.trim() || !password.trim()) {
            toast({ variant: 'destructive', description: "Yeni e-posta ve şifre boş olamaz."});
            return;
        }
        setIsChangingEmail(true);
        try {
            // Re-authenticate user first for security
            const credential = EmailAuthProvider.credential(user.email!, password);
            await reauthenticateWithCredential(user, credential);
            
            // If re-auth is successful, send verification to the new email
            await verifyBeforeUpdateEmail(user, newEmail);

            // Also update the email in our Firestore database
            await updateUserProfile({ userId: user.uid, email: newEmail });
            await refreshUserData();
            
            toast({
                title: "E-posta Güncelleme Başlatıldı",
                description: `E-posta adresinizi doğrulamak için ${newEmail} adresine bir link gönderildi. Lütfen onaylayın.`,
                duration: 10000,
            });
            setNewEmail('');
            setPassword('');
        } catch (e: any) {
            let message = "E-posta güncellenirken bir hata oluştu.";
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/wrong-password') {
                message = "Mevcut şifreniz yanlış.";
            } else if (e.code === 'auth/email-already-in-use') {
                 message = "Bu e-posta adresi zaten kullanımda.";
            } else if (e.code === 'auth/too-many-requests') {
                message = "Çok fazla deneme yapıldı. Lütfen daha sonra tekrar deneyin.";
            }
            toast({ variant: 'destructive', title: "Hata", description: message });
        } finally {
            setIsChangingEmail(false);
        }
    };

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
             // Log out from the current device for full security
            setTimeout(() => auth.signOut(), 3000);
        } catch (error: any) {
             toast({ variant: 'destructive', title: "Hata", description: error.message });
        } finally {
             setIsRevoking(false);
        }
    };

    const currentSession = userData?.sessions?.current;


    if (loading || !userData) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }
    
    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/profile"><ChevronLeft className="mr-2 h-4 w-4"/> Geri</Link>
                </Button>
                 <h1 className="text-lg font-semibold">Hesap Güvenliği</h1>
                 <div className="w-10"></div>
            </header>
            <div className="p-4 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle>E-posta Doğrulama</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {userData.emailVerified ? (
                            <Alert variant="default" className="border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-300">
                                <MailCheck className="h-4 w-4 text-green-600" />
                                <AlertTitle>E-posta Adresiniz Doğrulandı</AlertTitle>
                                <AlertDescription>
                                    Hesabınız güvende.
                                </AlertDescription>
                            </Alert>
                        ) : (
                             <Alert variant="destructive">
                                <MailWarning className="h-4 w-4" />
                                <AlertTitle>E-posta Adresiniz Doğrulanmadı</AlertTitle>
                                <AlertDescription>
                                    Hesabınızın güvenliğini artırmak ve tüm özellikleri kullanabilmek için lütfen e-postanızı doğrulayın.
                                </AlertDescription>
                            </Alert>
                        )}
                    </CardContent>
                     {!userData.emailVerified && (
                         <CardFooter>
                            <Button onClick={handleSendVerification} disabled={isVerifying}>
                                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                Doğrulama E-postasını Tekrar Gönder
                            </Button>
                        </CardFooter>
                     )}
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Oturum Yönetimi</CardTitle>
                        <CardDescription>
                             Aktif oturumlarınızı yönetin ve tanımadığınız cihazlardan çıkış yapın.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {currentSession && (
                            <div className="p-3 rounded-md border bg-muted/50">
                                <p className="font-semibold text-green-600">Mevcut Oturum</p>
                                <p className="text-sm text-muted-foreground">{currentSession.userAgent}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Son Aktif: {format(new Date(currentSession.lastSeen.seconds * 1000), 'PPpp', { locale: tr })}
                                </p>
                            </div>
                        )}
                    </CardContent>
                     <CardFooter>
                        <Button onClick={() => setShowRevokeConfirm(true)} disabled={isRevoking} variant="destructive">
                            {isRevoking ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <LogOut className="mr-2 h-4 w-4" />}
                            Diğer Tüm Oturumları Kapat
                        </Button>
                    </CardFooter>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>E-posta Adresini Değiştir</CardTitle>
                        <CardDescription>
                             Yeni bir e-posta adresi tanımlayın. Güvenlik nedeniyle mevcut şifrenizi girmeniz gerekmektedir.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                             <label htmlFor="current-email" className="text-sm font-medium text-muted-foreground">Mevcut E-posta</label>
                             <Input id="current-email" value={userData.email} disabled className="mt-1"/>
                        </div>
                        <div>
                            <label htmlFor="new-email">Yeni E-posta</label>
                            <Input id="new-email" type="email" placeholder="yeni.adres@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                        </div>
                         <div>
                            <label htmlFor="password">Mevcut Şifre</label>
                            <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                        </div>
                    </CardContent>
                     <CardFooter>
                        <Button onClick={handleChangeEmail} disabled={isChangingEmail || !newEmail || !password}>
                            {isChangingEmail && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                            E-postayı Değiştir
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
