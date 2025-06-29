// src/app/(main)/rooms/page.tsx
'use client';

import { useState } from "react";
import CreateRoomCard from "@/components/rooms/CreateRoomCard";
import RoomList from "@/components/rooms/RoomList";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import LeadershipBoard from "@/components/rooms/LeadershipBoard";

export default function RoomsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-7xl px-4 py-6 md:py-8">
        <div className="flex flex-col gap-6">
          <CreateRoomCard />

          <LeadershipBoard />
          
          <div className="space-y-4">
            <h2 className="text-2xl font-bold tracking-tight">Herkese Açık Odalar</h2>
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Oda adı ara..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
          </div>

          <RoomList searchTerm={searchTerm} />
        </div>
      </main>
    </div>
  );
}
