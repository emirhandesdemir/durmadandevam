// src/app/(main)/create/page.tsx
'use client';

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { PenSquare, Radio, Camera } from "lucide-react";

export default function CreatePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-full p-4">
            <div className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-bold text-center mb-6">Ne oluşturmak istersin?</h1>
                <Link href="/create-post">
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <PenSquare className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="font-semibold">Gönderi Oluştur</h2>
                            <p className="text-sm text-muted-foreground">Metin, fotoğraf veya video paylaş.</p>
                        </div>
                    </Card>
                </Link>
                <Link href="/create-story">
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <Camera className="h-8 w-8 text-purple-500" />
                        <div>
                            <h2 className="font-semibold">Hikaye Oluştur</h2>
                            <p className="text-sm text-muted-foreground">24 saat sonra kaybolacak bir an paylaş.</p>
                        </div>
                    </Card>
                </Link>
                <Link href="/rooms" className="md:hidden"> 
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <Radio className="h-8 w-8 text-destructive" />
                        <div>
                            <h2 className="font-semibold">Sohbet Odası Oluştur</h2>
                            <p className="text-sm text-muted-foreground">Yeni bir sohbet odası başlat.</p>
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
