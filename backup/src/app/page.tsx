"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/home');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/20 p-4 text-primary">
          <Users className="h-12 w-12" />
        </div>
        <h1 className="text-5xl font-bold tracking-tight text-foreground md:text-6xl">
          HiweWalk
        </h1>
        <p className="max-w-md text-lg text-muted-foreground">
          Herkese açık odalar oluşturun ve katılın. Düşüncelerinizi paylaşın, fikirler üzerinde işbirliği yapın ve başkalarıyla gerçek zamanlı olarak bağlantı kurun.
        </p>
      </div>
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="transition-transform hover:scale-105">
          <Link href="/login">Giriş Yap</Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="transition-transform hover:scale-105">
          <Link href="/signup">Kayıt Ol</Link>
        </Button>
      </div>
    </main>
  );
}
