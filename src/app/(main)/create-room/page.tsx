// src/app/(main)/create-room/page.tsx
import CreateRoomForm from "@/components/rooms/CreateRoomForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateRoomPage() {
  return (
    <div className="container mx-auto max-w-2xl py-8">
       <div className="flex items-center mb-6">
        <Button asChild variant="ghost" size="icon" className="mr-2">
            <Link href="/rooms">
                <ChevronLeft className="h-5 w-5" />
            </Link>
        </Button>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Oda Oluştur</h1>
      </div>
      <CreateRoomForm />
    </div>
  );
}
