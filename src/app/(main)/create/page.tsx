// src/app/(main)/create/page.tsx
'use client';

import { Card } from "@/components/ui/card";
import Link from "next/link";
import { PenSquare, Clapperboard, Sparkles } from "lucide-react";

export default function CreatePage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-full p-4">
            <div className="w-full max-w-md space-y-4">
                <h1 className="text-2xl font-bold text-center mb-6">Ne oluşturmak istersin?</h1>
                
                <Link href="/create-post" className="block">
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <PenSquare className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="font-semibold">Gönderi Oluştur</h2>
                            <p className="text-sm text-muted-foreground">Metin veya fotoğraf paylaş.</p>
                        </div>
                    </Card>
                </Link>

                <Link href="/create-surf" className="block">
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <Clapperboard className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="font-semibold">Surf Videosu Yükle</h2>
                            <p className="text-sm text-muted-foreground">Kısa video paylaşarak keşfedil.</p>
                        </div>
                    </Card>
                </Link>
                
                 <Link href="/avatar-creator" className="block">
                    <Card className="p-6 flex items-center gap-4 hover:bg-muted transition-colors cursor-pointer">
                        <Sparkles className="h-8 w-8 text-primary" />
                        <div>
                            <h2 className="font-semibold">Avatar Oluşturucu</h2>
                            <p className="text-sm text-muted-foreground">Karakterini detaylıca tasarla.</p>
                        </div>
                    </Card>
                </Link>

            </div>
        </div>
    )
}
