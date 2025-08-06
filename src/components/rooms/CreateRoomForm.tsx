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
  FormDescription,
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const formSchema = z.object({
  name: z.string().min(3, { message: "Ad en az 3 karakter olmalıdır." }).max(50, {message: "Ad en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData, refreshUserData } = useAuth();
    const { i18n } = useTranslation();
    const [isLoading, setIsLoading] = useState(false);
    
    const hasFreeCreations = (userData?.freeRoomCreations || 0) > 0;
    const roomCost = 10;
    const costText = hasFreeCreations ? "1 Ücretsiz Hak" : `${roomCost} Elmas`;


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { name: "", description: ""},
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
        <Card className="w-full">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <CardHeader>
                        <CardTitle>Oda Detayları</CardTitle>
                        <CardDescription>
                           Odanız için bir ad ve açıklama belirleyin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Oda Adı</FormLabel>
                                <FormControl>
                                    <Input placeholder="Harika odamın adı..." {...field} />
                                </FormControl>
                                <FormDescription>Odanızın listede görünecek adı.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Açıklama</FormLabel>
                                <FormControl>
                                    <Input placeholder="Bu odada neler hakkında konuşulacak?" {...field} />
                                </FormControl>
                                <FormDescription>Odanızın konusunu ve amacını açıklayın.</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                         <div className="text-sm text-muted-foreground">
                            Maliyet: <strong className="text-primary flex items-center gap-1">{costText} {!hasFreeCreations && <Gem className="h-4 w-4" />}</strong>
                        </div>
                        <Button type="submit" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Oluştur
                        </Button>
                    </CardFooter>
                </form>
            </Form>
        </Card>
    );
}

    