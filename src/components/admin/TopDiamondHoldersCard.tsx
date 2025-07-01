// src/components/admin/TopDiamondHoldersCard.tsx
'use client';

import { useEffect, useState } from "react";
import { getTopDiamondHolders } from "@/lib/actions/analyticsActions";
import type { UserProfile } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Gem, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Madalya renkleri (Altın, Gümüş, Bronz)
const medalColors = [
    'text-yellow-500', 
    'text-slate-400',   
    'text-orange-600' 
];

/**
 * En çok elmasa sahip kullanıcıları gösteren bir liderlik tablosu kartı.
 */
export default function TopDiamondHoldersCard() {
    const [topUsers, setTopUsers] = useState<Partial<UserProfile>[]>([]);
    const [loading, setLoading] = useState(true);

    // Bileşen yüklendiğinde veriyi sunucu eyleminden çek.
    useEffect(() => {
        getTopDiamondHolders().then(users => {
            setTopUsers(users);
            setLoading(false);
        });
    }, []);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Gem className="text-cyan-400"/>
                    Elmas Liderlik Tablosu
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    // Veri yüklenirken iskelet (skeleton) arayüzü göster.
                    <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {topUsers.map((user, index) => (
                            <div key={user.uid} className="flex items-center gap-4">
                               {/* İlk üç kullanıcıya madalya ikonu ekle */}
                               <Crown className={cn("h-5 w-5", index < 3 ? medalColors[index] : 'text-muted-foreground')}/>
                               <Avatar className="h-9 w-9">
                                    <AvatarImage src={user.photoURL || ''} />
                                    <AvatarFallback>{user.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <Link href={`/profile/${user.uid}`} className="font-semibold hover:underline" target="_blank">
                                        {user.username}
                                    </Link>
                                </div>
                                <div className="flex items-center font-bold">
                                    {user.diamonds}
                                    <Gem className="ml-1 h-4 w-4 text-cyan-400" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
