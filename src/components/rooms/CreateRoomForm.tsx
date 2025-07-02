// src/components/rooms/CreateRoomForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/actions/roomActions";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Gem } from "lucide-react";
import { useTranslation } from "react-i18next";

const formSchema = z.object({
  name: z.string().min(3, { message: "Ad en az 3 karakter olmalıdır." }).max(50, {message: "Ad en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData } = useAuth();
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", description: "" },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user || !userData) {
            toast({ title: "Hata", description: "Oda oluşturmak için giriş yapmalısınız.", variant: "destructive" });
            return;
        }

        setIsLoading(true);

        try {
            const result = await createRoom(user.uid, { ...values, language: i18n.language }, {
                username: userData.username,
                photoURL: userData.photoURL || null,
                role: userData.role || 'user',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            });

            if (result.success && result.roomId) {
                toast({
                    title: 'Oda Oluşturuldu!',
                    description: `"${values.name}" odasına yönlendiriliyorsunuz...`,
                });
                router.push(`/rooms/${result.roomId}`);
            } else {
                 throw new Error("Oda ID'si alınamadı.");
            }
        } catch (error: any) {
            console.error("Error creating community: ", error);
            toast({ title: "Hata", description: `Oluşturulurken bir hata oluştu: ${error.message}`, variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg shadow-xl rounded-3xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Yeni Bir Hızlı Oda Oluştur</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                   15 dakika sonra otomatik olarak kapanacak geçici bir sohbet odası başlat.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="ml-4">Oda Adı</FormLabel>
                                <FormControl><Input className="rounded-full px-5 py-6" placeholder="ör., Bilim Kurgu Kitap Kulübü" {...field} /></FormControl>
                                <FormMessage className="ml-4" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="ml-4">Açıklama</FormLabel>
                                <FormControl><Input className="rounded-full px-5 py-6" placeholder="ör., Haftanın kitabı: Dune" {...field} /></FormControl>
                                <FormMessage className="ml-4" />
                            </FormItem>
                        )} />
                        
                        <Button type="submit" size="lg" className="w-full rounded-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-75" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Oluştur
                        </Button>
                    </form>
                </Form>
            </CardContent>
             <CardFooter className="flex-col text-center">
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    Bu işlem <strong className="flex items-center gap-1">10 <Gem className="h-3 w-3 text-cyan-400" /></strong> gerektirir.
                </p>
            </CardFooter>
        </Card>
    );
}
