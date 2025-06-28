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
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  name: z.string().min(3, { message: "Ad en az 3 karakter olmalıdır." }).max(50, {message: "Ad en fazla 50 karakter olabilir."}),
  description: z.string().min(3, { message: "Açıklama en az 3 karakter olmalıdır." }).max(100, {message: "Açıklama en fazla 100 karakter olabilir."}),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const { user, userData } = useAuth();
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
            const userRoomsQuery = query(collection(db, "rooms"), where("createdBy.uid", "==", user.uid), limit(1));
            const userRoomsSnapshot = await getDocs(userRoomsQuery);
            if (!userRoomsSnapshot.empty) {
                toast({ title: "Oda Oluşturulamadı", description: "Zaten size ait bir oda var. Şimdilik sadece bir oda oluşturabilirsiniz.", variant: "destructive" });
                setIsLoading(false);
                return;
            }
            
            const settings = await getGameSettings();
            const newRoom: any = {
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
                }],
                maxParticipants: 9, 
                voiceParticipantsCount: 0,
            };

            const fifteenMinutesInMs = 15 * 60 * 1000;
            newRoom.expiresAt = Timestamp.fromMillis(Date.now() + fifteenMinutesInMs);
            newRoom.nextGameTimestamp = Timestamp.fromMillis(Date.now() + settings.gameIntervalMinutes * 60 * 1000);
            
            const docRef = await addDoc(collection(db, "rooms"), newRoom);

            toast({
                title: 'Oda Oluşturuldu!',
                description: `"${values.name}" odasına yönlendiriliyorsunuz...`,
            });
            router.push(`/rooms/${docRef.id}`); 
        } catch (error) {
            console.error("Error creating community: ", error);
            toast({ title: "Hata", description: `Oluşturulurken bir hata oluştu.`, variant: "destructive" });
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
        </Card>
    );
}
