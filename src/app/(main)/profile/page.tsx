// src/app/(main)/profile/page.tsx
"use client";

import ProfilePageClient from "@/components/profile/profile-page-client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { useRouter } from "next/navigation";


export default function ProfilePage() {
    const router = useRouter();
    return (
        <div>
            <header className="flex items-center justify-between p-2 border-b">
                 <Button onClick={() => router.back()} variant="ghost" className="rounded-full">
                    <ChevronLeft className="mr-2 h-4 w-4"/> Geri
                </Button>
                <h1 className="text-lg font-semibold">Ayarlar ve Aktiviteler</h1>
                 <div className="w-10"></div>
            </header>
             <ProfilePageClient />
        </div>
    )
}
