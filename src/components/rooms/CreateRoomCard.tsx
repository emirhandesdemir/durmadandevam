"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';

/**
 * Ana sayfada yeni oda oluşturma eylemini tetikleyen kart.
 */
export default function CreateRoomCard() {
    return (
        <Card className="bg-gradient-to-br from-primary via-primary/80 to-orange-500 text-primary-foreground shadow-lg">
            <CardHeader className="flex flex-col items-center justify-between gap-4 text-center md:flex-row md:text-left">
                <div className="space-y-2">
                    <CardTitle className="text-2xl">Yeni Bir Maceraya Başla!</CardTitle>
                    <CardDescription className="text-primary-foreground/90">
                        Kendi sohbet odanı oluştur ve insanları bir araya getir.
                    </CardDescription>
                </div>
                <Button
                    asChild
                    size="lg"
                    className="w-full shrink-0 md:w-auto rounded-full bg-white text-primary shadow-md transition-transform hover:scale-105 hover:bg-white/90 active:scale-95"
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
