// This page has been removed and replaced by the new /avatar-creator page.
// The new page offers manual, detailed avatar customization instead of AI generation.
// This file can be safely deleted in a future cleanup.
'use client';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function AvatarStudioPage() {
    const router = useRouter();

    useEffect(() => {
        router.replace('/avatar-creator');
    }, [router]);

    return (
        <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
    );
}
