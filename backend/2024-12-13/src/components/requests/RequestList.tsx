// src/components/requests/RequestList.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { handleFollowRequest } from "@/lib/actions/followActions";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Gelen takip isteklerini listeleyen ve yönetme eylemlerini (kabul/reddet) içeren bileşen.
 */
export default function RequestList() {
    const { user, userData, loading } = useAuth();
    const { toast } = useToast();
    const [processingId, setProcessingId] = useState<string | null>(null);

    const followRequests = userData?.followRequests || [];

    const onHandleRequest = async (requesterId: string, action: 'accept' | 'deny') => {
        if (!user) return;
        setProcessingId(requesterId);
        try {
            await handleFollowRequest(user.uid, requesterId, action);
            toast({
                description: action === 'accept' ? "Takip isteği kabul edildi." : "Takip isteği silindi.",
            });
        } catch (error) {
            console.error("Takip isteği işlenirken hata:", error);
            toast({
                variant: "destructive",
                title: "Hata",
                description: "İşlem sırasında bir hata oluştu.",
            });
        } finally {
            setProcessingId(null);
        }
    };
    
    if (loading) {
        return <div className="flex justify-center py-10"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (followRequests.length === 0) {
        return (
            <Card className="text-center p-8 border-dashed rounded-xl">
                <CardContent className="p-0">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold">Yeni İstek Yok</h3>
                    <p className="text-muted-foreground mt-2">Gelen takip istekleri burada görünecektir.</p>
                </CardContent>
            </Card>
        );
    }


    return (
        <div className="space-y-3">
            {followRequests.map((req: any) => (
                <Card key={req.uid} className="p-4">
                    <div className="flex items-center justify-between">
                        <Link href={`/profile/${req.uid}`} className="flex items-center gap-3 group">
                             <div className={cn("avatar-frame-wrapper", req.userAvatarFrame)}>
                                <Avatar className="relative z-[1] h-12 w-12">
                                    <AvatarImage src={req.photoURL} />
                                    <AvatarFallback>{req.username?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <span className="font-semibold group-hover:underline">{req.username}</span>
                        </Link>
                        <div className="flex gap-2">
                            {processingId === req.uid ? (
                                <Button disabled size="sm" className="w-20"><Loader2 className="h-4 w-4 animate-spin"/></Button>
                            ) : (
                                <>
                                    <Button onClick={() => onHandleRequest(req.uid, 'accept')} size="sm" className="w-20">Onayla</Button>
                                    <Button onClick={() => onHandleRequest(req.uid, 'deny')} size="sm" variant="ghost" className="w-20">Sil</Button>
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}
