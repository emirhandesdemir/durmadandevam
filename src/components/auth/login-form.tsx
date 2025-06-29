
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
// sendPasswordResetEmail'i içe aktar
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
import { Loader2, Eye, EyeOff } from "lucide-react";

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

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, values.email, values.password);
            router.push('/home');
        } catch (error: any) {
            console.error("Login error", error);
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
            console.error("Password reset error", error);
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
        <Card className="w-full max-w-sm shadow-xl rounded-3xl border-0">
            <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold">Giriş Yap</CardTitle>
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
                                    <div className="relative">
                                        <FormControl>
                                            <Input className="rounded-full px-5 py-6 pr-12" type={showPassword ? 'text' : 'password'} placeholder="••••••••" {...field} />
                                        </FormControl>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="absolute inset-y-0 right-0 h-full w-12 rounded-full text-muted-foreground"
                                            onClick={() => setShowPassword((prev) => !prev)}
                                        >
                                            {showPassword ? <EyeOff /> : <Eye />}
                                        </Button>
                                    </div>
                                    <FormMessage className="ml-4" />
                                </FormItem>
                            )}
                        />
                         <div className="flex items-center justify-end pr-4 -mt-2">
                            <Button 
                                type="button" 
                                variant="link" 
                                className="p-0 h-auto text-sm text-muted-foreground hover:text-primary"
                                onClick={handlePasswordReset}
                                disabled={isResetting}
                            >
                                {isResetting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Şifremi Unuttum
                            </Button>
                        </div>
                        <Button type="submit" size="lg" className="w-full rounded-full py-6 text-lg font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={isLoading}>
                            {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                            Giriş Yap
                        </Button>
                    </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                    Hesabınız yok mu?{" "}
                    <Link href="/signup" className="font-medium text-primary hover:underline">
                        Kayıt ol
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
