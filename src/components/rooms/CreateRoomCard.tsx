// src/components/rooms/CreateRoomCard.tsx
"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Odalar sayfasının en üstünde yer alan, kullanıcıyı karşılayan ve
 * yeni oda oluşturmaya yönlendiren renkli kart.
 */
export default function CreateRoomCard() {
    const { user } = useAuth();
    const username = user?.displayName?.split(' ')[0] || 'Dostum';

    return (
        <Card className="bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 text-primary-foreground shadow-2xl shadow-primary/20 rounded-3xl">
            <CardHeader className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left p-8">
                <div className="space-y-2">
                    <CardTitle className="text-3xl font-bold">Hoş geldin, {username}!</CardTitle>
                    <CardDescription className="text-primary-foreground/90 text-base">
                        Kendi sohbet odanı oluştur veya mevcut odalara katıl.
                    </CardDescription>
                </div>
                <Button
                    asChild
                    size="lg"
                    className="w-full shrink-0 md:w-auto rounded-full bg-white text-primary shadow-lg transition-transform hover:scale-105 hover:bg-white/90 active:scale-95 px-8 py-6 text-lg font-semibold"
                >
                    <Link href="/create-room">
                        <PlusCircle className="mr-2" />
                        Oda Oluştur
                    </Link>
                </Button>
            </CardHeader>
        </Card>
    );
}
