// src/components/layout/AccountSwitcher.tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PlusCircle, LogOut, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface AccountSwitcherProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountSwitcher({ isOpen, onOpenChange }: AccountSwitcherProps) {
  const { user, persistedUsers, switchAccount, handleLogout } = useAuth();
  
  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-center">Hesap Değiştir</SheetTitle>
          <SheetDescription className="text-center">
            Giriş yapmak için bir hesap seçin veya yeni bir hesap ekleyin.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          <div className="space-y-2">
            {persistedUsers.map((pUser) => (
              <button
                key={pUser.uid}
                onClick={() => switchAccount(pUser)}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted"
                disabled={pUser.uid === user.uid}
              >
                <Avatar className="h-11 w-11">
                  <AvatarImage src={pUser.photoURL || undefined} />
                  <AvatarFallback>{pUser.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span className="font-semibold text-left flex-1">{pUser.username}</span>
                {pUser.uid === user.uid && (
                  <CheckCircle className="h-5 w-5 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
        <SheetFooter className="flex-col sm:flex-col sm:space-x-0 gap-2">
            <Button asChild variant="outline" className="w-full">
                <Link href="/login"><PlusCircle className="mr-2 h-4 w-4"/> Başka Bir Hesap Ekle</Link>
            </Button>
            <Button variant="destructive" className="w-full" onClick={() => handleLogout({ removeAllAccounts: true })}>
                <LogOut className="mr-2 h-4 w-4"/> Tüm Hesaplardan Çıkış Yap
            </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
