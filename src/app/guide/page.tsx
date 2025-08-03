// src/app/guide/page.tsx
import GuidePageClient from "@/components/guide/GuidePageClient";
import { Suspense } from 'react';
import AnimatedLogoLoader from "@/components/common/AnimatedLogoLoader";

// This is the public-facing guide page, accessible without login.
export default function GuidePage() {
    return (
        <Suspense fallback={<AnimatedLogoLoader fullscreen />}>
             <GuidePageClient isPublicPage={true} />
        </Suspense>
    );
}
