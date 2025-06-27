// src/app/admin/system/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getGameSettings, updateGameSettings } from "@/lib/actions/gameActions";
import { useToast } from "@/hooks/use-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Settings, Loader2 } from "lucide-react";
import { GameSettings as GameSettingsType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

// Form validasyon şeması
const settingsSchema = z.object({
  dailyDiamondLimit: z.coerce.number().min(0, "Limit 0'dan küçük olamaz."),
  gameIntervalMinutes: z.coerce.number().min(1, "Aralık en az 1 dakika olmalıdır."),
  questionTimerSeconds: z.coerce.number().min(5, "Süre en az 5 saniye olmalıdır."),
  rewardAmount: z.coerce.number().min(1, "Ödül en az 1 olabilir."),
  cooldownSeconds: z.coerce.number().min(10, "Bekleme süresi en az 10 saniye olmalıdır."),
});


export default function SystemSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            dailyDiamondLimit: 50,
            gameIntervalMinutes: 5,
            questionTimerSeconds: 15,
            rewardAmount: 5,
            cooldownSeconds: 30
        },
    });

    // Ayarları Firestore'dan çek ve formu doldur
    useEffect(() => {
        const settingsRef = doc(db, 'config', 'gameSettings');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const settings = docSnap.data() as GameSettingsType;
                form.reset(settings); // Formu gelen veriyle güncelle
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [form]);


    // Formu gönderme fonksiyonu
    const onSubmit = async (values: z.infer<typeof settingsSchema>) => {
        setSaving(true);
        try {
            await updateGameSettings(values);
            toast({
                title: "Başarılı",
                description: "Oyun ayarları başarıyla güncellendi."
            });
        } catch (error) {
            toast({
                title: "Hata",
                description: "Ayarlar güncellenirken bir hata oluştu.",
                variant: "destructive"
            });
            console.error(error);
        } finally {
            setSaving(false);
        }
    };


  return (
    <div>
      <div className="flex items-center gap-4">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistem Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanın genel işleyişini ve limitlerini yapılandırın.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="mt-8">
                <CardHeader>
                <CardTitle>Quiz Oyunu Ayarları</CardTitle>
                <CardDescription>
                    Oda içi quiz oyununun çalışma şeklini ve ödüllerini buradan yönetin.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {loading ? (
                        <div className="space-y-6">
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                            <Skeleton className="h-16 w-full" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="gameIntervalMinutes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Oyun Aralığı (Dakika)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="questionTimerSeconds" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Soru Süresi (Saniye)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="rewardAmount" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Doğru Cevap Ödülü (Elmas)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="dailyDiamondLimit" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Günlük Kazanma Limiti (Elmas)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="cooldownSeconds" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Oyun Sonrası Bekleme (Saniye)</FormLabel>
                                    <FormControl><Input type="number" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t px-6 py-4">
                    <Button type="submit" disabled={saving || loading}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Ayarları Kaydet
                    </Button>
                </CardFooter>
            </Card>
        </form>
      </Form>
    </div>
  );
}
