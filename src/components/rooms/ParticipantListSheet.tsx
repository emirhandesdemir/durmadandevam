// src/components/rooms/ParticipantListSheet.tsx
"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "../ui/scroll-area";

interface Participant {
    uid: string;
    username: string;
    photoURL?: string | null;
}

interface ParticipantListSheetProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    participants: Participant[];
}

export default function ParticipantListSheet({ isOpen, onOpenChange, participants }: ParticipantListSheetProps) {
    return (
        <Sheet open={isOpen} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col bg-gray-900 border-gray-700 text-gray-200">
                <SheetHeader className="text-left">
                    <SheetTitle>Katılımcılar ({participants.length})</SheetTitle>
                    <SheetDescription>
                        Bu odada bulunan tüm kullanıcılar.
                    </SheetDescription>
                </SheetHeader>
                <ScrollArea className="flex-1 -mx-6 px-6">
                    <div className="space-y-4 py-4">
                        {participants.map(p => (
                             <div key={p.uid} className="flex items-center gap-4">
                                <Avatar>
                                    <AvatarImage src={p.photoURL || undefined} />
                                    <AvatarFallback>{p.username.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <p className="font-medium text-foreground">{p.username}</p>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </SheetContent>
        </Sheet>
    )
}
