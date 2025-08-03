// src/app/(main)/guide/page.tsx
import GuidePageClient from "@/components/guide/GuidePageClient";

// This is the in-app guide page, for logged-in users.
export default function GuidePage() {
    return <GuidePageClient isPublicPage={false} />;
}
