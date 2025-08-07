// src/components/rooms/CreateRoomCard.tsx
"use client"

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, ChevronRight, Settings, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';
import CreateRoomForm from './CreateRoomForm';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog"


export default function CreateRoomCard() {
    const { user } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);

    if (!user) {
        return null;
    }

    return (
        <>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <Card className="border-dashed border-primary/50 bg-primary/10 hover:border-primary transition-colors">
                    <CardHeader className="text-center p-6">
                        <CardTitle>Yeni Bir Macera Başlat</CardTitle>
                        <CardDescription>
                            Kendine ait bir oda oluşturarak yeni insanlarla tanış ve sohbet et.
                        </CardDescription>
                        <DialogTrigger asChild>
                             <Button className="mt-2 w-fit mx-auto">
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Yeni Oda Oluştur
                            </Button>
                        </DialogTrigger>
                    </CardHeader>
                </Card>
                <DialogContent>
                    <CreateRoomForm />
                </DialogContent>
            </Dialog>
        </>
    );
}
