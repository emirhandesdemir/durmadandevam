// src/app/admin/system/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { updateGameSettings } from "@/lib/actions/gameActions";
import { useToast } from "@/hooks/use-toast";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Settings, Loader2, Gamepad2, UserX, Database, Signal } from "lucide-react";
import { GameSettings as GameSettingsType } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Slider } from "@/components/ui/slider";

// Form validasyon şeması
const settingsSchema = z.object({
  dailyDiamondLimit: z.coerce.number().min(0, "Limit 0'dan küçük olamaz."),
  gameIntervalMinutes: z.coerce.number().min(1, "Aralık en az 1 dakika olmalıdır."),
  questionTimerSeconds: z.coerce.number().min(5, "Süre en az 5 saniye olmalıdır."),
  rewardAmount: z.coerce.number().min(1, "Ödül en az 1 olabilir."),
  cooldownSeconds: z.coerce.number().min(10, "Bekleme süresi en az 10 saniye olmalıdır."),
  afkTimeoutMinutes: z.coerce.number().min(1, "AFK süresi en az 1 dakika olmalıdır."),
  imageUploadQuality: z.coerce.number().min(0.1, "Kalite en az 0.1 olmalı").max(1, "Kalite en fazla 1 olabilir"),
  audioBitrate: z.coerce.number().min(16, "Bit hızı en az 16 olmalı").max(128, "Bit hızı en fazla 128 olabilir"),
  videoBitrate: z.coerce.number().min(100, "Bit hızı en az 100 olmalı").max(2000, "Bit hızı en fazla 2000 olabilir"),
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
            cooldownSeconds: 30,
            afkTimeoutMinutes: 8,
            imageUploadQuality: 0.92,
            audioBitrate: 64,
            videoBitrate: 1000,
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
                description: "Sistem ayarları başarıyla güncellendi."
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
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Gamepad2 className="h-6 w-6 text-muted-foreground" />
                                <CardTitle>Quiz Oyunu Ayarları</CardTitle>
                            </div>
                            <CardDescription>
                                Oda içi quiz oyununun çalışma şeklini ve ödüllerini buradan yönetin.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="space-y-6">
                                    <Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" />
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormField control={form.control} name="gameIntervalMinutes" render={({ field }) => (
                                        <FormItem><FormLabel>Oyun Aralığı (Dakika)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="questionTimerSeconds" render={({ field }) => (
                                        <FormItem><FormLabel>Soru Süresi (Saniye)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="rewardAmount" render={({ field }) => (
                                        <FormItem><FormLabel>Doğru Cevap Ödülü (Elmas)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="dailyDiamondLimit" render={({ field }) => (
                                        <FormItem><FormLabel>Günlük Kazanma Limiti (Elmas)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                    <FormField control={form.control} name="cooldownSeconds" render={({ field }) => (
                                        <FormItem className="md:col-span-2"><FormLabel>Oyun Sonrası Bekleme (Saniye)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <UserX className="h-6 w-6 text-muted-foreground" />
                                <CardTitle>Sesli Sohbet Ayarları</CardTitle>
                            </div>
                            <CardDescription>Sesli sohbet odalarının işleyişiyle ilgili kuralları belirleyin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-16 w-full" /> : (
                                <FormField control={form.control} name="afkTimeoutMinutes" render={({ field }) => (
                                    <FormItem><FormLabel>AFK Zaman Aşımı (Dakika)</FormLabel><FormControl><Input type="number" {...field} className="max-w-sm" /></FormControl><FormMessage /></FormItem>
                                )} />
                            )}
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Database className="h-6 w-6 text-muted-foreground" />
                                <CardTitle>Depolama & Yükleme Ayarları</CardTitle>
                            </div>
                            <CardDescription>Yüklenecek resimlerin kalitesini ve boyutunu yönetin.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-16 w-full" /> : (
                                <FormField control={form.control} name="imageUploadQuality" render={({ field }) => (
                                    <FormItem><FormLabel>Resim Yükleme Kalitesi ({field.value})</FormLabel>
                                    <FormControl><Slider min={0.1} max={1} step={0.01} value={[field.value]} onValueChange={(vals) => field.onChange(vals[0])} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            )}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <Signal className="h-6 w-6 text-muted-foreground" />
                                <CardTitle>WebRTC & Ses Kalitesi Ayarları</CardTitle>
                            </div>
                            <CardDescription>Sesli sohbetin bant genişliği ve kalitesiyle ilgili ayarlar.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {loading ? (
                                <div className="space-y-6"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
                            ) : (
                                <>
                                    <FormField control={form.control} name="audioBitrate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ses Bit Hızı (kbps)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="videoBitrate" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Video Bit Hızı (kbps)</FormLabel>
                                            <FormControl><Input type="number" {...field} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
             <div className="flex justify-end mt-8">
                <Button type="submit" disabled={saving || loading} size="lg">
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Tüm Ayarları Kaydet
                </Button>
            </div>
        </form>
      </Form>
    </div>
  );
}
