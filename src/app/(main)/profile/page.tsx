// src/app/(main)/profile/page.tsx
"use client";

// This file is now a client component wrapper around ProfilePageClient.
// This was done to accommodate the significant state and effect logic
// required for the new, more interactive profile settings page.
import ProfilePageClient from "@/components/profile/profile-page-client";

export default function ProfilePage() {
    return <ProfilePageClient />;
}
