// src/app/(main)/wallet/page.tsx
'use client';

import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Gem, Gift, Loader2, Store, Repeat, ShoppingCart, ArrowRightLeft, History } from "lucide-react";
import { convertProfileValueToDiamonds } from "@/lib/actions/giftActions";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { giftList } from "@/lib/gifts";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { giftLevelThresholds } from "@/lib/gifts";
import type { Transaction } from "@/lib/types";
import { getTransactions } from "@/lib/actions/transactionActions";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import { cn } from "@/lib/utils";


function TransactionHistory() {
    const { user } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) {
            getTransactions(user.uid)
                .then(setTransactions)
                .finally(() => setLoading(false));
        }
    }, [user]);

    if (loading) {
        return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
    }
    
    if (transactions.length === 0) {
        return <p className="text-sm text-center text-muted-foreground py-4">Henüz bir işlem yok.</p>;
    }

    return (
        <div className="space-y-3">
            {transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50">
                    <div className="flex-1">
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(tx.timestamp as any), 'PPp', { locale: tr })}</p>
                    </div>
                    <div className={cn(
                        "font-bold text-sm flex items-center gap-1",
                        tx.amount > 0 ? "text-green-500" : "text-destructive"
                    )}>
                        {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString('tr-TR')}
                        <Gem className="h-3 w-3" />
                    </div>
                </div>
            ))}
        </div>
    )
}


export default function WalletPage() {
    const { user, userData } = useAuth();
    const { toast } = useToast();
    const [isConverting, setIsConverting] = useState(false);

    if (!user || !userData) {
        return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    const handleConvert = async () => {
        setIsConverting(true);
        try {
            const result = await convertProfileValueToDiamonds(user.uid);
            if (result.success) {
                toast({
                    title: "Dönüştürme Başarılı!",
                    description: `Hediye değerinizden ${result.convertedAmount} elmas kazandınız.`
                });
            } else {
                throw new Error(result.error || "Dönüştürme işlemi başarısız oldu.");
            }
        } catch (error: any) {
             toast({ variant: 'destructive', description: error.message || 'Bir hata oluştu.' });
        } finally {
            setIsConverting(false);
        }
    };
    
    return (
        <div className="container mx-auto max-w-2xl py-6 space-y-6">
             <div className="flex items-center gap-3">
                <Wallet className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Cüzdanım</h1>
            </div>

            <Card className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground overflow-hidden">
                <CardHeader>
                    <CardTitle className="text-lg">Toplam Bakiye</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Gem className="h-10 w-10" />
                        <span className="text-5xl font-bold tracking-tighter">{userData.diamonds?.toLocaleString('tr-TR') || 0}</span>
                    </div>
                     <Button asChild variant="secondary">
                        <Link href="/store"><ShoppingCart className="mr-2 h-4 w-4"/> Mağaza</Link>
                    </Button>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5"/> Hediye Değeri</CardTitle>
                    <CardDescription>Profiline gönderilen hediyelerin toplam değeri. Bunu elmasa dönüştürebilirsin.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="font-bold text-2xl text-primary">{userData.profileValue || 0} Değer</p>
                    <Button onClick={handleConvert} disabled={isConverting || (userData.profileValue || 0) <= 0} className="w-full sm:w-auto">
                        {isConverting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Repeat className="mr-2 h-4 w-4"/>}
                        Elmasa Dönüştür (%70)
                    </Button>
                </CardContent>
             </Card>

             <Card>
                 <CardHeader>
                    <CardTitle className="flex items-center gap-2"><History className="h-5 w-5"/> İşlem Geçmişi</CardTitle>
                    <CardDescription>Son elmas hareketlerin.</CardDescription>
                </CardHeader>
                 <CardContent>
                   <TransactionHistory />
                </CardContent>
             </Card>
        </div>
    )
}
