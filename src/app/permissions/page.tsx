// This file is no longer used and will be removed.
// For now, it redirects to the home page as a fallback.
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

export default function PermissionsRedirectPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/home');
    }, [router]);

    return <AnimatedLogoLoader fullscreen />;
}
