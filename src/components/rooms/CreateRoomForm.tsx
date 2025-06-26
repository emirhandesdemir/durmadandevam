// src/components/rooms/CreateRoomForm.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useState } from "react";
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { getGameSettings } from "@/lib/actions/gameActions";


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

/**
 * Yeni Oda Oluşturma Formu
 * 
 * Kullanıcıların yeni bir oda oluşturmak için gerekli bilgileri
 * (oda adı, açıklama) girdiği formdur.
 * - Zod ile form validasyonu yapılır.
 * - Form gönderildiğinde Firestore'a yeni bir oda dokümanı ekler.
 * - Litmatch tarzı yuvarlak ve renkli bir tasarıma sahiptir.
 */

// Form validasyon şeması
const formSchema = z.object({
  name: z.string().min(3, { message: "Oda adı en az 3 karakter olmalıdır." }).max(50, {message: "Oda adı en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData } = useAuth();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: "",
            description: "",
        },
    });

    // Form gönderme fonksiyonu
    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!user || !userData) {
            toast({
                title: "Hata",
                description: "Oda oluşturmak için giriş yapmalısınız.",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            // Kullanıcının zaten bir odası var mı diye kontrol et
            const userRoomsQuery = query(collection(db, "rooms"), where("createdBy.uid", "==", user.uid), limit(1));
            const userRoomsSnapshot = await getDocs(userRoomsQuery);

            if (!userRoomsSnapshot.empty) {
                 toast({
                    title: "Oda Oluşturulamadı",
                    description: "Zaten size ait bir oda var. Sadece bir oda oluşturabilirsiniz.",
                    variant: "destructive",
                });
                setIsLoading(false);
                router.push('/rooms');
                return;
            }

            // İlk oyun için zamanlayıcıyı ayarla
            const settings = await getGameSettings();
            const nextGameTimestamp = Timestamp.fromMillis(Date.now() + settings.gameIntervalMinutes * 60 * 1000);

            // Firestore için yeni oda nesnesi
            const newRoom = {
                name: values.name,
                description: values.description,
                createdBy: {
                  uid: user.uid,
                  username: user.displayName || "Bilinmeyen Kullanıcı",
                  photoURL: user.photoURL,
                  role: userData.role || 'user'
                },
                createdAt: serverTimestamp(),
                participants: [{
                    uid: user.uid,
                    username: user.displayName || "Anonim",
                    photoURL: user.photoURL || null
                }], // Başlangıçta kurucuyu katılımcı olarak ekle
                maxParticipants: 9, // Maksimum katılımcı sayısı (1 kurucu + 8 kişi)
                voiceParticipantsCount: 0, // Sesli sohbet katılımcı sayısı
                nextGameTimestamp, // İlk oyun zamanı
            };
            
            // Firestore'a yeni odayı ekle
            await addDoc(collection(db, "rooms"), newRoom);

            toast({
                title: "Oda Oluşturuldu!",
                description: `"${values.name}" odası başarıyla oluşturuldu.`,
            });
            router.push('/rooms'); // Odalar sayfasına yönlendir
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
        <Card className="w-full max-w-lg shadow-xl rounded-3xl border-0 bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Yeni Oda Oluştur</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                    Yeni bir sohbet odası başlatmak için ayrıntıları doldurun.
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
                        <Button 
                            type="submit" 
                            size="lg" 
                            className="w-full rounded-full py-6 text-lg font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transition-transform hover:scale-105 disabled:opacity-75"
                            disabled={isLoading}
                        >
                             {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                             Odayı Oluştur
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
