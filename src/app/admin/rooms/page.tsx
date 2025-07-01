// src/app/admin/rooms/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MessageSquare, Loader2 } from "lucide-react";
import RoomsTable from "@/components/admin/RoomsTable";

// Yönetici panelinde gösterilecek oda verisi için arayüz.
export interface AdminRoomData {
    id: string;
    name: string;
    description: string;
    createdBy: {
        uid: string;
        username: string;
    };
    createdAt: Timestamp;
    participants: { uid: string, username: string }[];
    maxParticipants: number;
}

/**
 * Yönetim Paneli - Oda Yöneticisi Sayfası
 * 
 * Firestore'daki tüm aktif odaları listeler ve yöneticinin bu odaları
 * izlemesi veya silmesi için bir arayüz sağlar.
 */
export default function RoomManagerPage() {
    const [rooms, setRooms] = useState<AdminRoomData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Odaları en yeniden en eskiye doğru sıralayarak getir.
        const q = query(collection(db, "rooms"), orderBy("createdAt", "desc"));
        
        // `onSnapshot` ile koleksiyonu dinle, böylece yeni odalar veya
        // değişiklikler anında arayüze yansır.
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const roomsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdminRoomData));
            setRooms(roomsData);
            setLoading(false);
        }, (error) => {
            console.error("Odaları çekerken hata:", error);
            setLoading(false);
        });

        // Component unmount olduğunda dinleyiciyi temizle.
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <div className="flex items-center gap-4">
                <MessageSquare className="h-8 w-8 text-primary" />
                <div>
                <h1 className="text-3xl font-bold tracking-tight">Oda Yöneticisi</h1>
                <p className="text-muted-foreground mt-1">
                    Aktif odaları yönetin, sohbetleri izleyin veya odaları kapatın.
                </p>
                </div>
            </div>

            <div className="mt-8">
                 {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <RoomsTable rooms={rooms} />
                )}
            </div>
        </div>
    );
}
