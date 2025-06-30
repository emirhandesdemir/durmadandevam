// src/app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Loader2 } from "lucide-react";
import UsersTable from "@/components/admin/UsersTable";

// Kullanıcı verisinin arayüzü
export interface UserData {
    uid: string;
    username: string;
    email: string;
    role: 'admin' | 'user';
    createdAt: Timestamp;
    photoURL?: string;
    diamonds?: number;
}

/**
 * Kullanıcı Yöneticisi Sayfası
 * 
 * Bu sayfa, Firestore'daki tüm kullanıcıları gerçek zamanlı olarak listeler
 * ve onları bir tablo içinde yönetmek için arayüz sağlar.
 */
export default function UserManagerPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 'users' koleksiyonunu dinlemek için bir sorgu oluştur, oluşturulma tarihine göre sırala
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                uid: doc.id, // doküman ID'sini uid olarak ata
            } as UserData));
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Kullanıcıları çekerken hata:", error);
            setLoading(false);
        });

        // Component unmount olduğunda dinleyiciyi temizle
        return () => unsubscribe();
    }, []);

    return (
        <div>
            <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-primary" />
                <div>
                <h1 className="text-3xl font-bold tracking-tight">Kullanıcı Yöneticisi</h1>
                <p className="text-muted-foreground mt-1">
                    Kullanıcıları görüntüleyin, rollerini yönetin veya hesaplarını askıya alın.
                </p>
                </div>
            </div>

            <div className="mt-8">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <UsersTable users={users} />
                )}
            </div>
        </div>
    );
}
