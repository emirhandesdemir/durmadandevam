// Bu bileşen, /create-room sayfasında gösterilen oda oluşturma formunu içerir.
// Bu dosyanın adı `CreateRoomForm.tsx` olarak değiştirilip `src/components/rooms` altına taşınabilir
// çünkü mantık olarak oda ile ilgili bir bileşendir ve mevcut `CreateRoomForm.tsx` ile birleştirilebilir.
// Şimdilik olduğu gibi bırakıp yorumluyorum.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from "react";
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

// Form alanlarının validasyonunu (doğrulamasını) yöneten Zod şeması.
const formSchema = z.object({
  roomName: z.string().min(3, { message: "Oda adı en az 3 karakter olmalıdır." }),
  topic: z.string().min(3, { message: "Konu en az 3 karakter olmalıdır." }),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    // Kullanıcı giriş yapmamışsa, onu giriş sayfasına yönlendir.
    useEffect(() => {
        if (!authLoading && !user) {
            toast({
                title: "Giriş Gerekli",
                description: "Oda oluşturmak için giriş yapmalısınız. Yönlendiriliyor...",
                variant: "destructive",
            });
            router.push('/login');
        }
    }, [user, authLoading, router, toast]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            roomName: "",
            topic: "",
        },
    });

    // Form gönderildiğinde çalışacak fonksiyon.
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
            // Firestore'da yeni bir oda dokümanı oluştur.
            await addDoc(collection(db, "rooms"), {
                name: values.roomName,
                topic: values.topic,
                createdBy: user.uid,
                creatorName: user.displayName || "Bilinmeyen Kullanıcı",
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Oda Oluşturuldu!",
                description: `"${values.roomName}" odası başarıyla oluşturuldu.`,
            });
            router.push('/home'); // Başarılı olursa ana sayfaya yönlendir.
        } catch (error) {
            console.error("Oda oluşturulurken hata: ", error);
            toast({
                title: "Hata",
                description: "Oda oluşturulurken bir hata oluştu.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }
    
    // Auth durumu yüklenirken bir yükleme göstergesi göster.
    if (authLoading) {
        return (
             <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl">Yeni Oda Oluştur</CardTitle>
                    <CardDescription>
                       Yetki kontrol ediliyor...
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-center items-center p-8">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                </CardContent>
             </Card>
        );
    }
    
    // Kullanıcı yoksa (ve yönlendirme bekleniyorsa) hiçbir şey render etme.
    if (!user) {
         return null;
    }


    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="text-2xl">Yeni Oda Oluştur</CardTitle>
                <CardDescription>
                    Yeni bir herkese açık oda başlatmak için aşağıdaki ayrıntıları doldurun.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="roomName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Oda Adı</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ör., Haftasonu Oyuncuları" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="topic"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Konu</FormLabel>
                                    <FormControl>
                                        <Input placeholder="ör., Co-op Oyun" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full" disabled={isLoading}>
                             {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                             Odayı Oluştur ve Başlat
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
