import CreateRoomForm from "@/components/rooms/CreateRoomForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CreateRoomPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <Button
        asChild
        variant="ghost"
        className="absolute left-4 top-4 md:left-8 md:top-8 rounded-full"
      >
        <Link href="/home">
          <ChevronLeft className="mr-2 h-4 w-4" />
          Geri Dön
        </Link>
      </Button>
      <div className="w-full animate-in zoom-in-95 duration-500">
        <CreateRoomForm />
      </div>
    </main>
  );
}
