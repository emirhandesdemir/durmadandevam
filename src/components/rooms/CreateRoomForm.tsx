"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

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

const formSchema = z.object({
  name: z.string().min(3, { message: "Oda adı en az 3 karakter olmalıdır." }).max(50, {message: "Oda adı en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user) {
            toast({
                title: "Hata",
                description: "Oda oluşturmak için giriş yapmalısınız.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);
        try {
            const newRoom = {
                name: values.name,
                description: values.description,
                createdBy: {
                  uid: user.uid,
                  username: user.displayName || "Bilinmeyen Kullanıcı",
                },
                createdAt: serverTimestamp(),
                participants: [],
                maxParticipants: 7,
            };
            
            await addDoc(collection(db, "rooms"), newRoom);

            toast({
                title: "Oda Oluşturuldu!",
                description: `"${values.name}" odası başarıyla oluşturuldu.`,
            });
            router.push('/home');
        } catch (error) {
            console.error("Error creating room: ", error);
            toast({
                title: "Hata",
                description: "Oda oluşturulurken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-lg shadow-xl rounded-3xl border-0">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Yeni Oda Oluştur</CardTitle>
                <CardDescription className="text-base">
                    Yeni bir herkese açık oda başlatmak için aşağıdaki ayrıntıları doldurun.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="ml-4">Oda Adı</FormLabel>
                                    <FormControl>
                                        <Input className="rounded-full px-5 py-6" placeholder="ör., Bilim Kurgu Kitap Kulübü" {...field} />
                                    </FormControl>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="ml-4">Konu</FormLabel>
                                    <FormControl>
                                        <Input className="rounded-full px-5 py-6" placeholder="ör., Haftanın kitabı: Dune" {...field} />
                                    </FormControl>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" className="w-full rounded-full py-6 text-lg font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Odayı Oluştur ve Başlat
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
