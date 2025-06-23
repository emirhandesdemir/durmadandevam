"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RoomList from "@/components/feed/room-list";
import { PenSquare, Users } from "lucide-react";

export default function HomePage() {
  const { user, loading: authLoading } = useAuth();
  
  if (authLoading || !user) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight">HiweWalk</h1>
        </div>
      </header>

      <Link href="/create-room">
        <Card className="hover:bg-accent/20 transition-colors">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Avatar>
                          <AvatarImage src={user.photoURL || undefined} />
                          <AvatarFallback>{user.displayName?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className="text-muted-foreground">Yeni bir oda oluştur...</span>
                   </div>
                   <PenSquare className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
        </Card>
      </Link>
      
      <RoomList />

    </div>
  );
}
