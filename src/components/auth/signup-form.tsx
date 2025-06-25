"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

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
  username: z.string().min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." }),
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

export default function SignUpForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            await updateProfile(user, {
                displayName: values.username,
            });
            
            // Kullanıcı rolünü e-postaya göre belirle
            const isAdmin = values.email === 'admin@example.com';
            const userRole = isAdmin ? 'admin' : 'user';

            // Firestore'a kullanıcı dökümanını rolüyle birlikte kaydet
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: values.username,
                email: values.email,
                role: userRole,
                createdAt: serverTimestamp(),
            });

            toast({
                title: "Hesap Oluşturuldu",
                description: `Harika! Artık giriş yapabilirsiniz. ${isAdmin ? 'Admin yetkilerine sahipsiniz.' : ''}`,
            });
            
            router.push('/login');

        } catch (error: any)
        {
            console.error("Signup error", error);
            let errorMessage = "Hesap oluşturulurken bir hata oluştu.";
            if (error.code === "auth/email-already-in-use") {
                errorMessage = "Bu e-posta adresi zaten kullanılıyor.";
            }
            toast({
                title: "Hata",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Card className="w-full max-w-sm shadow-xl rounded-3xl border-0">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Hesap Oluştur</CardTitle>
                <CardDescription>
                    Aramıza katılmak için bilgilerinizi girin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="ml-4">Kullanıcı Adı</FormLabel>
                                    <FormControl>
                                        <Input className="rounded-full px-5 py-6" placeholder="hiwewalker" {...field} />
                                    </FormControl>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="ml-4">E-posta</FormLabel>
                                    <FormControl>
                                        <Input className="rounded-full px-5 py-6" placeholder="ornek@eposta.com" {...field} />
                                    </FormControl>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="ml-4">Şifre</FormLabel>
                                    <FormControl>
                                        <Input className="rounded-full px-5 py-6" type="password" placeholder="••••••••" {...field} />
                                    </FormControl>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" size="lg" className="w-full rounded-full py-6 text-lg font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Hesap Oluştur
                        </Button>
                    </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                    Zaten bir hesabınız var mı?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                        Giriş yap
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
