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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const formSchema = z.object({
  name: z.string().min(3, { message: "Ad en az 3 karakter olmalıdır." }).max(50, {message: "Ad en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
  type: z.enum(['public', 'event']).optional(),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData, refreshUserData } = useAuth();
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    
    const isAdmin = userData?.role === 'admin';

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", description: "", type: "public" },
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
            
            await refreshUserData();

            toast({
                title: 'Oda Oluşturuldu!',
                description: `"${values.name}" odanız oluşturuldu.`,
            });
            
            router.push(`/rooms/${result.roomId}`);

        } catch (error: any) {
            console.error("Error creating community: ", error);
            toast({ 
                title: "Oda Oluşturma Başarısız", 
                description: `Odanız oluşturulurken bir hata oluştu: ${error.message}`, 
                variant: "destructive",
                duration: 9000 
            });
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-3xl bg-card/80 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-white">Yeni Bir Oda Oluştur</CardTitle>
                <CardDescription className="text-base text-white/80">
                   Arkadaşlarınla sohbet etmek için yeni bir oda başlat.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {isAdmin && (
                            <FormField
                                control={form.control}
                                name="type"
                                render={({ field }) => (
                                    <FormItem className="space-y-3 p-4 bg-black/20 rounded-xl">
                                    <FormLabel className="text-white/90">Oda Tipi (Admin)</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1 text-white/80"
                                        >
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="public" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                            Normal Oda (Süreli)
                                            </FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="event" />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                            Etkinlik Odası (Süresiz & PIN Gerekli)
                                            </FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormControl><Input className="rounded-full px-5 py-7 bg-black/30 border-white/20 text-white placeholder:text-white/60 text-base" placeholder="Oda Adı..." {...field} /></FormControl>
                                <FormMessage className="ml-4 text-red-300" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormControl><Input className="rounded-full px-5 py-7 bg-black/30 border-white/20 text-white placeholder:text-white/60 text-base" placeholder="Açıklama..." {...field} /></FormControl>
                                <FormMessage className="ml-4 text-red-300" />
                            </FormItem>
                        )} />
                        
                        <Button type="submit" size="lg" className="w-full rounded-full py-7 text-lg font-semibold bg-gradient-to-r from-pink-500 to-yellow-500 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-75" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Odayı Kur ve Maceraya Başla
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
