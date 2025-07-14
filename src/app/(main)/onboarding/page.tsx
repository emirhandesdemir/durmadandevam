'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

export default function OnboardingPage() {
  const router = useRouter();

  // Onboarding has been removed, so we redirect users to the home page.
  useEffect(() => {
    router.replace('/home');
  }, [router]);

  // Show a loader while redirecting.
  return (
    <AnimatedLogoLoader fullscreen />
  );
}
