// src/app/admin/broadcast/page.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RadioTower, Send } from "lucide-react";
import { sendBroadcastNotification } from "@/lib/actions/notificationActions";

const broadcastSchema = z.object({
  title: z.string().min(5, "Başlık en az 5 karakter olmalıdır.").max(50, "Başlık en fazla 50 karakter olabilir."),
  body: z.string().min(10, "Mesaj en az 10 karakter olmalıdır.").max(150, "Mesaj en fazla 150 karakter olabilir."),
  link: z.string().optional(),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export default function BroadcastPage() {
    const { toast } = useToast();
    const [isSending, setIsSending] = useState(false);
    const form = useForm<BroadcastFormValues>({
        resolver: zodResolver(broadcastSchema),
        defaultValues: { title: "", body: "", link: "" },
    });

    const onSubmit = async (values: BroadcastFormValues) => {
        setIsSending(true);
        try {
            const result = await sendBroadcastNotification(values);
            if (result.success) {
                toast({
                    title: "Duyuru Gönderildi",
                    description: "Bildirim tüm kullanıcılara gönderilmek üzere sıraya alındı.",
                });
                form.reset();
            } else {
                throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Hata",
                description: `Duyuru gönderilemedi: ${error.message}`,
            });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div>
            <div className="flex items-center gap-4">
                <RadioTower className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Toplu Duyuru Gönder</h1>
                    <p className="text-muted-foreground mt-1">
                        Tüm bildirim abonelerine anlık bildirim gönderin.
                    </p>
                </div>
            </div>

            <Card className="mt-8">
                <CardHeader>
                    <CardTitle>Yeni Duyuru</CardTitle>
                    <CardDescription>
                        Bu formu doldurarak tüm kullanıcılara bir duyuru gönderebilirsiniz. Bu işlemi dikkatli kullanın.
                    </CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-4">
                            <FormField control={form.control} name="title" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Başlık</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Örn: Yeni Özellik Geldi!" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="body" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mesaj İçeriği</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Uygulamamıza eklediğimiz yeni X özelliğini hemen keşfedin!" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="link" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Yönlendirme Linki (İsteğe Bağlı)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="/rooms/oda-id" {...field} />
                                    </FormControl>
                                     <FormMessage />
                                     <p className="text-xs text-muted-foreground pt-1">Uygulama içi bir yol belirtin. Örn: `/profile/kullanici-id`</p>
                                </FormItem>
                            )} />
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isSending}>
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Tüm Kullanıcılara Gönder
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
