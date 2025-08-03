// src/app/(main)/profile/page.tsx
"use client";

import ProfilePageClient from "@/components/profile/profile-page-client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

/**
 * Main Settings Page (/profile)
 * This page now acts as a layout wrapper for the settings content,
 * providing a consistent header for all sub-settings pages.
 */
export default function ProfilePage() {
    return (
        <div>
            <header className="flex items-center p-2 border-b">
                 <Button asChild variant="ghost" className="rounded-full">
                    <Link href="/home"><ChevronLeft className="mr-2 h-4 w-4"/> Ana Sayfa</Link>
                </Button>
                <h1 className="text-lg font-semibold mx-auto">Ayarlar ve Aktiviteler</h1>
            </header>
             <ProfilePageClient />
        </div>
    )
}
