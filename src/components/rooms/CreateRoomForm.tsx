
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
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

        // Optimistic UI: Redirect immediately
        router.push('/rooms');
        toast({
            title: 'Oda Oluşturuluyor...',
            description: `"${values.name}" odanız oluşturuluyor ve kısa süre içinde listede görünecektir.`,
        });

        try {
            await createRoom(user.uid, { ...values, language: i18n.language }, {
                username: userData.username,
                photoURL: userData.photoURL || null,
                role: userData.role || 'user',
                selectedAvatarFrame: userData.selectedAvatarFrame || '',
            });
            // The user is already redirected, so no further action is needed on success.
        } catch (error: any) {
            // If the background operation fails, navigate back (optional) or just show an error.
            console.error("Error creating community: ", error);
            // We show a persistent error toast so the user knows something went wrong.
            toast({ 
                title: "Oda Oluşturma Başarısız", 
                description: `Odanız oluşturulurken bir hata oluştu: ${error.message}`, 
                variant: "destructive",
                duration: 9000
            });
        } finally {
            // Do not set isLoading to false, as we've already navigated away.
        }
    }

    return (
        <Card className="w-full max-w-lg shadow-xl rounded-3xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Yeni Bir Oda Oluştur</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                   Arkadaşlarınla sohbet etmek için yeni bir oda başlat.
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
                        
                        <Button type="submit" size="lg" className="w-full rounded-full py-6 text-lg font-semibold bg-gradient-to-r from-red-500 to-blue-600 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-75" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Oda Oluştur
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
