// src/app/guide/page.tsx
'use client';

import GuidePageClient from "@/components/guide/GuidePageClient";
import { Suspense } from 'react';
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";
import { useAuth } from "@/contexts/AuthContext";

// This page now handles both logged-in and logged-out states.
export default function GuidePage() {
    const { user, loading } = useAuth();

    // If we're still checking auth, show a loader.
    if (loading) {
        return <AnimatedLogoLoader fullscreen />;
    }

    // Determine if we should show the public version (no user)
    // or the in-app version (user is logged in).
    const isPublic = !user;

    return (
        <Suspense fallback={<AnimatedLogoLoader fullscreen />}>
             <GuidePageClient isPublicPage={isPublic} />
        </Suspense>
    );
}
