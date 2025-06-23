"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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
  roomName: z.string().min(3, { message: "Oda adı en az 3 karakter olmalıdır." }),
  topic: z.string().min(3, { message: "Konu en az 3 karakter olmalıdır." }),
});

export default function CreateRoomForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            if (!currentUser) {
                 setTimeout(() => {
                    router.push('/login');
                }, 2000);
            }
        });
        return () => unsubscribe();
    }, [router]);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            roomName: "",
            topic: "",
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
            await addDoc(collection(db, "rooms"), {
                name: values.roomName,
                topic: values.topic,
                createdBy: user.uid,
                creatorName: user.displayName || "Bilinmeyen Kullanıcı",
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Oda Oluşturuldu!",
                description: `"${values.roomName}" odası "${values.topic}" konusuyla şimdi yayında.`,
            });
            form.reset();
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
    
    if (authLoading) {
        return (
             <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Yeni Oda Oluştur</CardTitle>
                    <CardDescription>
                       Yükleniyor...
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
    
    if (!user) {
         return (
             <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="font-headline text-2xl">Giriş Gerekli</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>Oda oluşturmak için giriş yapmalısınız. Giriş sayfasına yönlendiriliyorsunuz...</p>
                </CardContent>
             </Card>
        );
    }


    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="font-headline text-2xl">Yeni Oda Oluştur</CardTitle>
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
                             Oda Oluştur
                        </Button>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
