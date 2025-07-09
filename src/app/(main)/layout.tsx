// src/app/(main)/layout.tsx
'use client';

import BottomNav from "@/components/layout/bottom-nav";
import Header from "@/components/layout/Header";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

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

  const isFullPageLayout = pathname.startsWith('/rooms/') || pathname.startsWith('/dm/');
  const isHeaderlessPage = isFullPageLayout;
  const isHomePage = pathname === '/home';

  return (
    <>
      <div className="relative flex h-dvh w-full flex-col bg-background overflow-hidden">
        <main 
          className={cn(
            "flex-1 flex flex-col",
            isFullPageLayout ? "overflow-hidden" : "overflow-y-auto pb-24"
          )}
        >
           {!isHeaderlessPage && (
              <header
                className="sticky top-0 z-40"
              >
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
    </>
  );
}
