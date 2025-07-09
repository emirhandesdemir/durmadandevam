
'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Gift } from 'lucide-react';

export default function PremiumWelcomeManager() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!userData) return;

    // Check if the user is premium and if they've seen the welcome message before.
    const isPremium = userData.premiumUntil && userData.premiumUntil.toDate() > new Date();
    const hasSeenWelcomeKey = `hasSeenPremiumWelcome_${userData.uid}`;
    
    // Check localStorage in a try-catch block for environments where it might not be available.
    let hasSeenWelcome = false;
    try {
        hasSeenWelcome = localStorage.getItem(hasSeenWelcomeKey) === 'true';
    } catch (e) {
        console.warn("Could not access localStorage. Premium welcome message may show again.");
    }

    if (isPremium && !hasSeenWelcome) {
      setIsOpen(true);
      try {
        localStorage.setItem(hasSeenWelcomeKey, 'true');
      } catch (e) {
         console.warn("Could not write to localStorage.");
      }
    }
  }, [userData]);

  if (!isOpen) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center items-center">
            <div className="p-4 rounded-full bg-yellow-400/20 mb-4">
                 <Crown className="h-12 w-12 text-yellow-500" />
            </div>
          <DialogTitle className="text-2xl font-bold">Premium'a Hoş Geldin!</DialogTitle>
          <DialogDescription>
            Aramıza katıldığın için teşekkürler. İşte seni bekleyen özel avantajlar:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            {userData?.isFirstPremium && (
                <div className="flex items-start gap-4 p-3 bg-green-500/10 rounded-lg">
                    <Gift className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold">İlk Üyelik Hediyen!</h4>
                        <p className="text-sm text-muted-foreground">100 Elmas ve 3 gün sınırsız oda kurma hakkı hesabına eklendi!</p>
                    </div>
                </div>
            )}
            <div className="flex items-start gap-4 p-3">
                <Sparkles className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Özel Görünüm</h4>
                    <p className="text-sm text-muted-foreground">Profilinde ve sohbetlerde kırmızı premium tacı, çerçeve ve baloncuk efektleri.</p>
                </div>
            </div>
             <div className="flex items-start gap-4 p-3">
                <Sparkles className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                <div>
                    <h4 className="font-semibold">Ücretsiz Oda Geliştirmeleri</h4>
                    <p className="text-sm text-muted-foreground">Oda katılımcı limitini elmas harcamadan, ücretsiz olarak artır.</p>
                </div>
            </div>
        </div>
        <DialogFooter>
          <Button className="w-full" onClick={() => setIsOpen(false)}>Harika, Başlayalım!</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
