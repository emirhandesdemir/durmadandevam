// src/components/profile/DeleteAccountDialog.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { deleteUserAccount } from '@/lib/actions/userActions';
import { reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ShieldAlert, MailWarning } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'initial' | 'password' | 'finalConfirm';

export default function DeleteAccountDialog({ isOpen, onOpenChange }: DeleteAccountDialogProps) {
  const { user, userData, handleLogout } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>('initial');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    onOpenChange(false);
    // Reset state on close after a small delay
    setTimeout(() => {
        setStep('initial');
        setPassword('');
        setError(null);
        setIsLoading(false);
    }, 300);
  };

  const handlePasswordConfirm = async () => {
    if (!user || !password) {
        setError("Lütfen şifrenizi girin.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
        const credential = EmailAuthProvider.credential(user.email!, password);
        await reauthenticateWithCredential(user, credential);
        setStep('finalConfirm');
    } catch (e: any) {
        if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
            setError("Yanlış şifre. Lütfen tekrar deneyin.");
        } else {
            setError("Kimlik doğrulanırken bir hata oluştu.");
        }
    } finally {
        setIsLoading(false);
    }
  }

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await deleteUserAccount(user.uid);
      if (result.success) {
        toast({ title: "Hesabınız Silindi", description: "Tüm verileriniz kalıcı olarak silindi. Güvenle çıkış yapılıyor...", duration: 5000 });
        handleClose();
        handleLogout(false);
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      setError(e.message || "Hesap silinirken bir hata oluştu.");
    } finally {
        setIsLoading(false);
    }
  }
  
  const renderStep = () => {
    switch (step) {
      case 'initial':
        return (
            <motion.div key="initial" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Hesabını Sil</DialogTitle>
                    <DialogDescription>Bu işlem geri alınamaz. Devam etmek için lütfen aşağıdaki adımları izleyin.</DialogDescription>
                </DialogHeader>
                {userData?.emailVerified === false ? (
                    <Alert variant="destructive" className="mt-4">
                        <MailWarning className="h-4 w-4" />
                        <AlertDescription>
                            Hesabınızı silebilmek için önce e-posta adresinizi doğrulamanız gerekmektedir. Lütfen Ayarlar &gt; Hesap Güvenliği bölümünden doğrulama işlemini tamamlayın.
                        </AlertDescription>
                    </Alert>
                ) : (
                     <div className="py-4">
                        <p className="text-sm text-muted-foreground">Devam ettiğinizde, hesabınızı kalıcı olarak silme sürecini başlatacaksınız. Bu işlem tüm gönderilerinizi, yorumlarınızı ve diğer verilerinizi silecektir.</p>
                    </div>
                )}
                 <DialogFooter>
                    <Button variant="outline" onClick={handleClose}>İptal</Button>
                    <Button onClick={() => setStep('password')} disabled={!userData?.emailVerified}>
                        Devam Et
                    </Button>
                </DialogFooter>
            </motion.div>
        );
      case 'password':
         return (
            <motion.div key="password" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                    <DialogTitle>Güvenlik Onayı</DialogTitle>
                    <DialogDescription>Hesabınızı silme işlemine devam etmek için lütfen şifrenizi girin.</DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <Label htmlFor="password">Şifre</Label>
                    <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordConfirm()}/>
                     {error && <p className="text-sm text-destructive">{error}</p>}
                </div>
                 <DialogFooter>
                    <Button variant="outline" onClick={() => setStep('initial')}>Geri</Button>
                    <Button onClick={handlePasswordConfirm} disabled={isLoading || !password}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>} Onayla
                    </Button>
                </DialogFooter>
            </motion.div>
         )
       case 'finalConfirm':
        return (
             <motion.div key="finalConfirm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <DialogHeader>
                    <DialogTitle className="text-destructive">Son Onay</DialogTitle>
                    <DialogDescription>
                        Bu son adımdır. Hesabınızı ve tüm verilerinizi kalıcı olarak silmek istediğinizden **emin misiniz**? Bu işlem hiçbir şekilde geri alınamaz.
                    </DialogDescription>
                </DialogHeader>
                 <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setStep('password')}>Geri</Button>
                    <Button variant="destructive" onClick={handleDeleteAccount} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Evet, Hesabımı Kalıcı Olarak Sil
                    </Button>
                </DialogFooter>
            </motion.div>
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <AnimatePresence mode="wait">
            {renderStep()}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
