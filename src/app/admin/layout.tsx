// src/app/admin/layout.tsx
// This layout handles authentication and authorization for all /admin routes.
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/admin/sidebar";
import Header from "@/components/admin/header";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";
import { redirect } from "next/navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { userData, loading, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return <AnimatedLogoLoader fullscreen />;
  }

  if (!user) {
    redirect('/login');
    return null; // Redirect will happen, return null to avoid rendering anything.
  }
  
  if (userData?.role !== 'admin') {
      return (
          <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
              <ShieldAlert className="h-16 w-16 text-destructive" />
              <h1 className="mt-6 text-3xl font-bold text-foreground">Erişim Reddedildi</h1>
              <p className="mt-2 max-w-md text-muted-foreground">
                  Bu sayfayı görüntülemek için yönetici yetkilerine sahip değilsiniz.
              </p>
              <div className="mt-8 flex gap-4">
                <Button asChild>
                    <Link href="/home">Ana Sayfaya Dön</Link>
                </Button>
              </div>
          </div>
      )
  }

  // Render the admin panel for authorized users
  return (
    <div className="flex h-screen bg-muted/40">
      <Sidebar isSidebarOpen={isSidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
