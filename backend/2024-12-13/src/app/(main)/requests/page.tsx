// src/app/(main)/requests/page.tsx
import RequestList from "@/components/requests/RequestList";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

/**
 * Gelen takip isteklerini yönetmek için kullanılan sayfa.
 */
export default function FollowRequestsPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center p-4 bg-background">
      <div className="w-full max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
           <Button asChild variant="ghost" size="icon" className="mr-2">
                <Link href="/home">
                    <ChevronLeft/>
                </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Takip İstekleri</h1>
        </div>
        <RequestList />
      </div>
    </main>
  );
}
