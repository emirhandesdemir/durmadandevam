// src/app/admin/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Users, Loader2 } from "lucide-react";
import UsersTable from "@/components/admin/UsersTable";
import type { UserProfile } from '@/lib/types';
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";


/**
 * Kullanıcı Yöneticisi Sayfası
 * 
 * Bu sayfa, Firestore'daki tüm kullanıcıları gerçek zamanlı olarak listeler
 * ve onları bir tablo içinde yönetmek için arayüz sağlar.
 */
export default function UserManagerPage() {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
    const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
    const debouncedSearchTerm = useDebounce(searchTerm, 300);

    useEffect(() => {
        // 'users' koleksiyonunu dinlemek için bir sorgu oluştur, oluşturulma tarihine göre sırala.
        const q = query(collection(db, "users"), orderBy("createdAt", "desc"));
        
        // Firestore dinleyicisi: `users` koleksiyonunda bir değişiklik olduğunda
        // (yeni kullanıcı, veri güncellemesi vb.) bu fonksiyon tekrar çalışır ve state'i günceller.
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const usersData = querySnapshot.docs.map(doc => ({
                ...doc.data(),
                uid: doc.id, // doküman ID'sini uid olarak ekle.
            } as UserProfile));
            setUsers(usersData);
            setLoading(false);
        }, (error) => {
            console.error("Kullanıcıları çekerken hata:", error);
            setLoading(false);
        });

        // Component unmount olduğunda dinleyiciyi temizle.
        // Bu, hafıza sızıntılarını önler.
        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(user => {
        const searchMatch = debouncedSearchTerm.length > 0 
            ? user.username.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) || 
              user.email.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
            : true;
        
        const roleMatch = roleFilter === 'all' || user.role === roleFilter;
        const genderMatch = genderFilter === 'all' || user.gender === genderFilter;

        return searchMatch && roleMatch && genderMatch;
    });

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

            <div className="mt-8 flex flex-col md:flex-row gap-4">
                 <Input 
                    placeholder="Kullanıcı adı veya e-posta ile ara..." 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                 />
                 <div className="flex items-center gap-2">
                    <Button variant={genderFilter === 'all' ? 'default' : 'outline'} onClick={() => setGenderFilter('all')}>Tümü</Button>
                    <Button variant={genderFilter === 'male' ? 'default' : 'outline'} onClick={() => setGenderFilter('male')}>Erkek</Button>
                    <Button variant={genderFilter === 'female' ? 'default' : 'outline'} onClick={() => setGenderFilter('female')}>Kadın</Button>
                 </div>
                 <div className="flex items-center gap-2">
                    <Button variant={roleFilter === 'all' ? 'default' : 'outline'} onClick={() => setRoleFilter('all')}>Tüm Roller</Button>
                    <Button variant={roleFilter === 'admin' ? 'default' : 'outline'} onClick={() => setRoleFilter('admin')}>Admin</Button>
                    <Button variant={roleFilter === 'user' ? 'default' : 'outline'} onClick={() => setRoleFilter('user')}>Kullanıcı</Button>
                 </div>
            </div>

            <div className="mt-4">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : (
                    <UsersTable users={filteredUsers} />
                )}
            </div>
        </div>
    );
}
