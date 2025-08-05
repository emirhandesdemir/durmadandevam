// src/app/(main)/profile/hidden-content/page.tsx
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

// This page is obsolete and has been replaced by /profile/feed-settings
// Redirect to the new page.
export default function HiddenContentRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/profile/feed-settings');
    }, [router]);

    return <AnimatedLogoLoader fullscreen />;
}
