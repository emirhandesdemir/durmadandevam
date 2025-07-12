// Bu dosya, uygulamanın giriş sayfasını oluşturur.
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";
import { getAuth, onIdTokenChanged, signInWithEmailAndPassword, type User } from "firebase/auth";
import { app } from "@/lib/firebase";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import Link from 'next/link';

// Tarayıcıda kayıtlı olan kullanıcıları listelemek için bir bileşen
function AccountSwitcher({ users, onSelectAccount }: { users: User[], onSelectAccount: (user: User) => void }) {
    return (
        <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20">
            <CardHeader>
                <CardTitle className="text-center">Hesap Seç</CardTitle>
                <CardDescription className="text-center">Devam etmek için bir hesap seçin.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
                {users.map((user) => (
                    <button
                        key={user.uid}
                        onClick={() => onSelectAccount(user)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                    >
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={user.photoURL || undefined} />
                            <AvatarFallback>{user.displayName?.charAt(0) || user.email?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="text-left">
                            <p className="font-semibold">{user.displayName}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </button>
                ))}
                <div className="pt-2">
                    <Button variant="outline" className="w-full" asChild>
                         <Link href="/login?addNew=true">
                            <UserPlus className="mr-2 h-4 w-4"/>
                            Başka bir hesap kullan
                        </Link>
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [persistedUsers, setPersistedUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    // Bu hook, Firebase'in yerel depolamadaki tüm kullanıcılarını getirir.
    const auth = getAuth(app);
    const unsubscribe = onIdTokenChanged(auth, async (user) => {
        const allUsers = (auth as any).currentUser?.providerData?.length > 0 ? (auth as any)._getAllUsers() : [];
        setPersistedUsers(allUsers);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && user) {
      const redirectUrl = searchParams.get('redirect') || '/home';
      router.replace(redirectUrl);
    }
  }, [user, loading, router, searchParams]);
  
  const showAccountSwitcher = persistedUsers.length > 0 && !searchParams.get('addNew') && !selectedUser;

  const handleSelectAccount = (user: User) => {
    setSelectedUser(user);
  };
  
  if (loading || (user && !searchParams.get('addNew'))) {
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
      <div className="w-full animate-in zoom-in-95 duration-500">
        {showAccountSwitcher ? (
            <AccountSwitcher users={persistedUsers} onSelectAccount={handleSelectAccount} />
        ) : (
            <LoginForm prefilledUser={selectedUser} onBackToSwitcher={() => setSelectedUser(null)} />
        )}
      </div>
    </main>
  );
}
