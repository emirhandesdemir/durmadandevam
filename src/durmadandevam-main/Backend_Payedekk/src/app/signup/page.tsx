// src/app/signup/page.tsx
"use client";

import { Suspense } from 'react';
import SignUpPageContent from './SignUpPageContent';

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center auth-bg">
        <div className="h-12 w-12 rounded-full border-4 border-t-white animate-spin"></div>
      </div>
    }>
      <SignUpPageContent />
    </Suspense>
  );
}
