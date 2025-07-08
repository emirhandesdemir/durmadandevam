// src/app/(main)/layout.tsx
'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Ana Uygulama Düzeni (Main App Layout)
 * 
 * Bu bileşen, kullanıcı giriş yaptıktan sonra görünen tüm sayfalar için
 * genel bir çerçeve (iskelet) oluşturur. Header, BottomNav gibi ortak 
 * UI elemanlarını içerir.
 */
export default function MainAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/') || pathname.startsWith('/call/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';

  if (!user) {
    return null; // Or a loading spinner
  }

  return (
    <div className="relative flex h-screen w-full flex-col bg-background overflow-hidden">
        <main 
            className={cn(
            "flex-1 flex flex-col hide-scrollbar pb-20",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto"
            )}
        >
            {!isHeaderlessPage && (
                <header className="sticky top-0 z-40">
                    <Header />
                </header>
            )}
            
            <div
                className={cn(
                    "flex-1 flex flex-col",
                    isFullPageLayout ? "overflow-hidden" : "",
                    !isHomePage && !isFullPageLayout && "p-4"
                )}
            >
                {children}
            </div>
        </main>
        
        <BottomNav />
      </div>
  );
}
