// src/app/admin/layout.tsx
// Bu, tüm /admin rotaları için ana iskelet (layout) bileşenidir.
// Kimlik doğrulama ve yetkilendirme kontrollerini burada yapar.
// Sidebar ve Header gibi admin paneline özgü UI bileşenlerini içerir.
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/admin/sidebar";
import Header from "@/components/admin/header";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Yetkilendirme kontrolü
  useEffect(() => {
    // Veri yüklenmesi bittiğinde kontrol et.
    if (!loading) {
      if (!user) {
        // Kullanıcı giriş yapmamışsa, login sayfasına yönlendir.
        // Nereden geldiğini belirtmek için redirect parametresi ekle.
        router.replace("/login?redirect=/admin/dashboard");
      }
    }
  }, [user, loading, router]);
  
  // Yükleme ekranı: Kullanıcı ve yetki verileri gelene kadar gösterilir.
  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-background gap-4">
        <AnimatedLogoLoader />
        <p className="text-lg text-muted-foreground">Yönetici bilgileri yükleniyor...</p>
      </div>
    );
  }

  // Yetkisiz erişim ekranı: Giriş yapmış ama 'admin' rolü olmayan kullanıcılar için.
  if (!user || userData?.role !== 'admin') {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
              <ShieldAlert className="h-16 w-16 text-destructive" />
              <h1 className="mt-6 text-3xl font-bold text-foreground">Erişim Reddedildi</h1>
              <p className="mt-2 max-w-md text-muted-foreground">
                  Bu sayfayı görüntülemek için yönetici yetkilerine sahip değilsiniz.
                  Lütfen yetkili bir hesap ile giriş yapın.
              </p>
              <div className="mt-8 flex gap-4">
                <Button asChild>
                    <Link href="/home">Ana Sayfaya Dön</Link>
                </Button>
                <Button asChild variant="secondary">
                    <Link href="/login?redirect=/admin/dashboard">Yeniden Giriş Yap</Link>
                </Button>
              </div>
          </div>
      )
  }

  // Yetkili kullanıcılar için admin paneli düzeni
  return (
    <div className="flex h-screen bg-muted/40">
      {/* Yan Menü (Sidebar) */}
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Üst Başlık (Header), mobil için menü butonu içerir */}
        <Header setSidebarOpen={setSidebarOpen} />
        
        {/* Ana İçerik Alanı: children prop'u ile gelen sayfa içeriği burada render edilir. */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}