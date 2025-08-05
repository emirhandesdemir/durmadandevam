// src/app/page.tsx
'use client';

import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

// This component's only job is to show a loader.
// All redirection logic is now handled centrally in AuthContext,
// which prevents the login page from flashing before the user is authenticated.
export default function RootPage() {
  return <AnimatedLogoLoader fullscreen />;
}
