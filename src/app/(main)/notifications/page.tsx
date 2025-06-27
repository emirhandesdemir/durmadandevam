// src/app/(main)/notifications/page.tsx
import NotificationList from '@/components/notifications/NotificationList';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotificationsPage() {
  return (
    <div className="container mx-auto max-w-2xl px-2 py-4 sm:px-4 sm:py-6">
      <div className="flex items-center mb-6">
        <Button asChild variant="ghost" size="icon" className="mr-2">
          <Link href="/home">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Bildirimler</h1>
      </div>
      <NotificationList />
    </div>
  );
}
