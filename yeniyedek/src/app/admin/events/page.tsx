// src/app/admin/events/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Gift, Loader2, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventsTable from "@/components/admin/EventsTable";
import CreateEventRoomDialog from "@/components/admin/CreateEventRoomDialog";
import { Room } from "@/lib/types";

export default function EventsPage() {
    const [eventRooms, setEventRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

    useEffect(() => {
        const q = query(
            collection(db, "rooms"),
            where("type", "==", "event"),
            orderBy("createdAt", "desc")
        );
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const roomsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as Room));
            setEventRooms(roomsData);
            setLoading(false);
        }, (error) => {
            console.error("Etkinlik odaları alınırken hata:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleAddNew = () => {
        setSelectedRoom(null);
        setIsDialogOpen(true);
    };

    const handleEdit = (room: Room) => {
        // Edit functionality can be added later if needed
        // setSelectedRoom(room);
        // setIsDialogOpen(true);
    };

    return (
        <div>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Gift className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Etkinlik Yönetimi</h1>
                        <p className="text-muted-foreground mt-1">
                            Etkinlik odaları oluşturun ve yönetin.
                        </p>
                    </div>
                </div>
                <Button onClick={handleAddNew}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Yeni Etkinlik Odası
                </Button>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <EventsTable rooms={eventRooms} onEdit={handleEdit} />
                )}
            </div>

            <CreateEventRoomDialog 
                isOpen={isDialogOpen}
                setIsOpen={setIsDialogOpen}
                room={selectedRoom}
            />
        </div>
    );
}
