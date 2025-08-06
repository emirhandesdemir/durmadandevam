// This page is no longer needed as room creation is now handled
// directly from the 'CreateRoomCard' on the rooms page.
// This file can be safely deleted in a future cleanup.
'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function ObsoleteCreateRoomPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/rooms');
    }, [router]);
    return null;
}
