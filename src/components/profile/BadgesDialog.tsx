// src/components/profile/BadgesDialog.tsx
'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Award, BadgeCheck, Crown, Shield, Star, Rocket } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { useMemo } from 'react';

interface BadgesDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserProfile;
}

interface Badge {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  isEarned: boolean;
  colorClass: string;
}

export default function BadgesDialog({ isOpen, onOpenChange, user }: BadgesDialogProps) {
  
  const badges: Badge[] = useMemo(() => {
    const isPremium = user.premiumUntil && new Date((user.premiumUntil as any)?.seconds * 1000 || user.premiumUntil) > new Date();
    
    // Pioneer badge if account created before a certain date (e.g., end of 2024)
    const pioneerCutoff = new Date('2025-01-01T00:00:00Z');
    const userCreatedAt = user.createdAt ? new Date((user.createdAt as any)?.seconds * 1000 || user.createdAt) : new Date();
    const isPioneer = userCreatedAt < pioneerCutoff;

    return [
      {
        id: 'premium',
        icon: Crown,
        title: 'Premium Üye',
        description: 'Uygulamayı premium üyelik alarak destekleyen değerli kullanıcı.',
        isEarned: !!isPremium,
        colorClass: 'text-yellow-500'
      },
      {
        id: 'verified',
        icon: BadgeCheck,
        title: 'Onaylı Hesap',
        description: 'E-posta adresini doğrulayarak hesabının güvenliğini artırmış kullanıcı.',
        isEarned: user.emailVerified,
        colorClass: 'text-blue-500'
      },
      {
        id: 'admin',
        icon: Shield,
        title: 'Yönetici',
        description: 'Uygulama yöneticisi veya moderatörü.',
        isEarned: user.role === 'admin',
        colorClass: 'text-primary'
      },
      {
        id: 'gift_leader',
        icon: Star,
        title: 'Hediye Lideri (Seviye 5+)',
        description: 'Cömertliğiyle öne çıkan ve hediye göndererek 5. seviyeye ulaşmış kullanıcı.',
        isEarned: (user.giftLevel || 0) >= 5,
        colorClass: 'text-rose-500'
      },
      {
        id: 'pioneer',
        icon: Rocket,
        title: 'Pioneer',
        description: 'Uygulamanın ilk zamanlarından beri bizimle olan öncü ve değerli kullanıcı.',
        isEarned: isPioneer,
        colorClass: 'text-teal-500'
      },
    ];
  }, [user]);

  const earnedBadges = badges.filter(b => b.isEarned);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md h-[60vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-6 w-6" />
            Rozetler: {user.username}
          </DialogTitle>
          <DialogDescription>
            Kullanıcının kazandığı başarılar ve rozetler.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-4">
            {earnedBadges.length > 0 ? (
                earnedBadges.map(badge => {
                    const Icon = badge.icon;
                    return (
                        <div key={badge.id} className="flex items-start gap-4">
                            <div className={`p-3 rounded-full bg-muted`}>
                                <Icon className={`h-6 w-6 ${badge.colorClass}`} />
                            </div>
                            <div>
                                <h4 className="font-semibold">{badge.title}</h4>
                                <p className="text-sm text-muted-foreground">{badge.description}</p>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center text-muted-foreground pt-10">
                    <p>Bu kullanıcının henüz kazandığı bir rozet yok.</p>
                </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
