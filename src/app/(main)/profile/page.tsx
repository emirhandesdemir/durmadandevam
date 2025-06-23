import ProfilePageClient from "@/components/profile/profile-page-client";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function ProfilePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4">
       <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4 md:left-8 md:top-8"
      >
        <Link href="/home">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Geri
        </Link>
      </Button>
      <ProfilePageClient />
    </main>
  );
}
