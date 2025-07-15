// src/app/signup/page.tsx
"use client";

import { Suspense } from 'react';
import SignUpForm from '@/components/auth/signup-form';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import { useEffect } from 'react';

function SignUpPageContent() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      redirect('/home');
    }
  }, [user, loading]);

  // The loading state is now handled by the AuthProvider wrapper.
  // We just need to handle the redirect if the user is already logged in.
  if (!loading && user) {
    return null; // Return null during redirection
  }

  if (!loading && !user) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
          <div className="flex-1 flex flex-col items-center justify-center w-full">
              <div className="w-full max-w-sm animate-in zoom-in-95 duration-500">
                  <SignUpForm />
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
  return null;
}


export default function SignUpPage() {
  return (
    <Suspense fallback={<AnimatedLogoLoader fullscreen isAuthPage />}>
      <SignUpPageContent />
    </Suspense>
  );
}
