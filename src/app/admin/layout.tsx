// src/app/admin/layout.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/admin/sidebar";
import Header from "@/components/admin/header";
import { ShieldAlert, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { userData, loading, user } = useAuth();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();

  // Show a full-screen loader while auth data is being fetched.
  if (loading) {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  // Once loading is complete, check for user. If not present, redirect.
  // We return a loader here as well to give the router time to redirect
  // without attempting to render a broken UI state.
  if (!user || !userData) {
     router.replace('/login');
     return (
         <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
     );
  }
  
  // If user is present but not an admin, show access denied message.
  if (userData.role !== 'admin') {
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

  // If all checks pass, render the admin layout.
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
