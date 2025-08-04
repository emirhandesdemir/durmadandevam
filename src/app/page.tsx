// src/app/page.tsx
'use client';

import { Suspense } from 'react';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';

// This component's only job is to show a loader.
// All redirection logic is now handled centrally in AuthContext.
function PageContent() {
    return <AnimatedLogoLoader fullscreen />;
}

// This page now acts as the primary entry point.
// It shows a loader and then AuthContext handles redirection.
export default function RootPage() {
  return (
    <Suspense>
      <PageContent />
    </Suspense>
  );
}
