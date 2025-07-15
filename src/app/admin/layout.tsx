// src/app/admin/layout.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/admin/sidebar";
import Header from "@/components/admin/header";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { redirect } from "next/navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { userData, loading, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      redirect('/login');
    }
  }, [user, loading]);

  // AuthProvider handles the main loading screen. We just handle the case where
  // data has loaded, but the user is not an admin.
  if (!loading && userData?.role !== 'admin') {
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

  // If loading, or if the user is an admin, render the layout.
  // The AuthProvider will show a loader until `loading` is false.
  if (loading || (user && userData?.role === 'admin')) {
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

  // Fallback for any other state (e.g., redirecting)
  return null;
}


export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
