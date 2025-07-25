// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';

function PageContent() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (user) {
                router.replace('/home');
            } else {
                router.replace('/login');
            }
        }
    }, [user, loading, router]);

    return <AnimatedLogoLoader fullscreen />;
}

// This page now acts as the primary entry point.
// It shows a loader and then redirects based on auth state.
export default function RootPage() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
