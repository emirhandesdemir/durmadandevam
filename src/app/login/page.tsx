// src/app/login/page.tsx
"use client";

import { Suspense } from "react";
import LoginForm from "@/components/auth/login-form";
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";
import { useAuth } from "@/contexts/AuthContext";
import { redirect } from "next/navigation";

function LoginPageContent() {
  const { user, loading } = useAuth();

  // The loading state is now handled by the AuthProvider wrapper.
  // We just need to handle the redirect if the user is already logged in.
  if (!loading && user) {
    // AuthProvider will handle redirecting to /home after data loads.
    // For now, we can show the loader or just wait.
    return <AnimatedLogoLoader fullscreen isAuthPage />;
  }
  
  // If not loading and no user, show the login form.
  if (!loading && !user) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
                  <LoginForm />
              </div>
          </div>
          <footer className="py-4">
              <p className="text-xs text-white/70">
                  © 2025 BeWalk. All rights reserved.
              </p>
          </footer>
        </main>
    );
  }

  // Fallback for the brief moment between auth state change and redirect.
  return <AnimatedLogoLoader fullscreen isAuthPage />; 
}


export default function LoginPage() {
  return (
    // Suspense is good practice for components with client-side logic.
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <LoginPageContent/>
    </Suspense>
  );
}
