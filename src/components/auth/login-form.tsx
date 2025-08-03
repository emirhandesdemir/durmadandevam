// src/components/auth/login-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from "firebase/auth"; 
import { auth } from "@/lib/firebase";
import Image from "next/image";

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
import { Loader2, Eye, EyeOff, HelpCircle } from "lucide-react";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
});

export default function LoginForm() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [isResetting, setIsResetting] = useState(false); 
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        // This effect checks if the user was logged out due to being banned.
        if (typeof window !== 'undefined' && localStorage.getItem('isBanned') === 'true') {
            toast({
                title: "Hesap Askıya Alındı",
                description: "Bu hesaba erişiminiz kısıtlanmıştır.",
                variant: "destructive",
                duration: Infinity
            });
            localStorage.removeItem('isBanned');
        }
    }, [toast]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleGoogleSignIn = async () => {
        setIsGoogleLoading(true);
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // SUCCESS: Let AuthProvider handle the redirect after userData is loaded.
        } catch (error: any) {
             console.error("Google ile giriş hatası", error);
             let errorMessage = "Google ile giriş yapılırken bir hata oluştu.";
             if (error.code === 'auth/account-exists-with-different-credential') {
                errorMessage = "Bu e-posta ile daha önce başka bir yöntemle kayıt olunmuş."
             }
             toast({ title: "Giriş Başarısız", description: errorMessage, variant: "destructive" });
        } finally {
            setIsGoogleLoading(false);
        }
    };

    async function onSubmit(values: z.infer<typeof formSchema>>) {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            // SUCCESS: Let AuthProvider handle the redirect after userData is loaded.
        } catch (error: any) {
            console.error("Giriş hatası", error);
            let errorMessage = "Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.";
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                errorMessage = "E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol edip tekrar deneyin.";
            } else if (error.code === 'auth/too-many-requests') {
                errorMessage = "Çok fazla hatalı deneme yapıldı. Lütfen daha sonra tekrar deneyin.";
            } else if (error.code === 'auth/user-disabled') {
                errorMessage = "Bu kullanıcı hesabı askıya alınmıştır.";
            }
            toast({
                title: "Giriş Başarısız",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

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
        <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20 relative">
            <Form {...form}>
            <CardHeader className="text-center space-y-4 pt-10">
                 <Button asChild variant="outline" size="sm" className="absolute top-4 right-4 rounded-full">
                    <Link href="/guide">
                        <HelpCircle className="mr-2 h-4 w-4"/> Kılavuz
                    </Link>
                </Button>
                <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={64} height={64} className="h-16 w-16 mx-auto" />
                <CardTitle className="text-3xl font-bold">Tekrar Hoş Geldin!</CardTitle>
                <CardDescription>
                    Hesabınıza erişmek için bilgilerinizi girin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                        {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 61.9l-76.4 64.5c-24.1-22.6-56.3-36.6-96.5-36.6-69.8 0-129.2 53.4-148.9 124.7H99.4v-45.9h.2c22.8-51.1 76.3-86.4 138.6-86.4 53.6 0 98.4 22.2 130.6 54.9l-65.7 64.3H488V261.8z"></path></svg>}
                         Google ile Giriş Yap
                    </Button>
                    <div className="relative">
                        <Separator className="shrink-0" />
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase text-muted-foreground bg-card">Veya</div>
                    </div>
                    
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
                    
                </div>
                <div className="mt-6 text-center text-sm">
                    Hesabınız yok mu?{" "}
                    <Link href="/signup" className="font-semibold text-primary hover:underline">
                        Hemen Kayıt Ol
                    </Link>
                </div>
            </CardContent>
            </Form>
        </Card>
    );
}