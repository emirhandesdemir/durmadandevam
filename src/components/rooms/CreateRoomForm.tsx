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
import { Loader2, Gem, MessageSquare, TowerBroadcast } from "lucide-react";
import { useTranslation } from "react-i18next";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const formSchema = z.object({
  name: z.string().min(3, { message: "Ad en az 3 karakter olmalıdır." }).max(50, {message: "Ad en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
  mode: z.enum(['chat', 'broadcast'], { required_error: 'Oda türünü seçmelisiniz.' }),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData } = useAuth();
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", description: "", mode: "chat" },
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
                <CardTitle className="text-3xl font-bold">Yeni Bir Oda Oluştur</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                   Sohbet etmek veya canlı yayın yapmak için yeni bir oda başlat.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                       <FormField
                            control={form.control}
                            name="mode"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel className="ml-4">Oda Türü</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 gap-4"
                                    >
                                    <FormItem>
                                        <Label htmlFor="chat-mode" className="flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                            <RadioGroupItem value="chat" id="chat-mode" className="sr-only" />
                                            <MessageSquare className="mb-3 h-6 w-6" />
                                            <span className="font-bold">Sohbet Odası</span>
                                            <span className="text-xs text-muted-foreground mt-1 text-center">Sesli ve yazılı sohbet için. (10 Elmas)</span>
                                        </Label>
                                    </FormItem>
                                    <FormItem>
                                         <Label htmlFor="broadcast-mode" className="flex flex-col items-center justify-between rounded-lg border-2 p-4 cursor-pointer hover:bg-accent has-[:checked]:border-primary">
                                            <RadioGroupItem value="broadcast" id="broadcast-mode" className="sr-only" />
                                            <TowerBroadcast className="mb-3 h-6 w-6" />
                                            <span className="font-bold">Yayın Odası</span>
                                            <span className="text-xs text-muted-foreground mt-1 text-center">Canlı yayın yapmak için. (20 Elmas)</span>
                                        </Label>
                                    </FormItem>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
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
                <p className="text-xs text-muted-foreground">
                    Seçiminize göre maliyet uygulanacaktır.
                </p>
            </CardFooter>
        </Card>
    );
}
