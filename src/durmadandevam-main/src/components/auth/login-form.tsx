// Bu bileşen, kullanıcı giriş formunu ve ilgili tüm mantığı içerir.
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth"; 
import { auth } from "@/lib/firebase";

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
import { Loader2, Eye, EyeOff, Swords } from "lucide-react";

// Form alanlarının validasyonunu (doğrulamasını) yöneten Zod şeması.
const formSchema = z.object({
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

export default function LoginForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false); 
    const [showPassword, setShowPassword] = useState(false);

    // react-hook-form ile form yönetimi.
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    // Form gönderildiğinde çalışacak fonksiyon.
    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            router.push('/home'); // Başarılı girişte ana sayfaya yönlendir.
        } catch (error: any) {
            console.error("Giriş hatası", error);
            let errorMessage = "Giriş yapılırken bir hata oluştu.";
            if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
                errorMessage = "E-posta veya şifre hatalı.";
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

    // Şifre sıfırlama e-postası gönderme fonksiyonu.
    async function handlePasswordReset() {
        const email = form.getValues("email"); 
        if (!email) {
            toast({
                title: "E-posta Gerekli",
                description: "Şifrenizi sıfırlamak için lütfen e-posta adresinizi girin.",
                variant: "destructive",
            });
            return;
        }

        setIsResetting(true);
        try {
            await sendPasswordResetEmail(auth, email);
            toast({
                title: "E-posta Gönderildi",
                description: "Şifrenizi sıfırlamak için e-posta kutunuzu kontrol edin."
            });
        } catch (error: any) {
            console.error("Şifre sıfırlama hatası", error);
            let errorMessage = "Şifre sıfırlama e-postası gönderilirken bir hata oluştu.";
            if (error.code === 'auth/user-not-found') {
                errorMessage = "Bu e-posta adresiyle kayıtlı bir kullanıcı bulunamadı.";
            }
            toast({
                title: "Hata",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsResetting(false);
        }
    }

    return (
        <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center space-y-4">
                 <Swords className="mx-auto h-12 w-12 text-primary" />
                <CardTitle className="text-3xl font-bold">Tekrar Hoş Geldin!</CardTitle>
                <CardDescription>
                    Hesabınıza erişmek için bilgilerinizi girin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>E-posta</FormLabel>
                                    <FormControl>
                                        <Input type="email" placeholder="ornek@eposta.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="password"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex justify-between items-center">
                                        <FormLabel>Şifre</FormLabel>
                                        <Button 
                                            type="button" 
                                            variant="link" 
                                            className="p-0 h-auto text-xs text-muted-foreground hover:text-primary"
                                            onClick={handlePasswordReset}
                                            disabled={isResetting}
                                        >
                                            {isResetting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                                            Şifremi Unuttum
                                        </Button>
                                    </div>
                                    <div className="relative">
                                        <FormControl>
                                            <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute inset-y-0 right-0 h-full text-muted-foreground"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </Button>
                                    </div>
                                    <FormMessage/>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full text-lg font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Giriş Yap
                        </Button>
                    </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                    Hesabınız yok mu?{" "}
                    <Link href="/signup" className="font-semibold text-primary hover:underline">
                        Hemen Kayıt Ol
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
