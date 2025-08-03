// src/components/auth/signup-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { creditReferrer } from "@/lib/actions/diamondActions";
import { updateUserProfile } from "@/lib/actions/userActions";
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
import { Checkbox } from "../ui/checkbox";
import { useTranslation } from "react-i18next";
import { Separator } from "../ui/separator";

const formSchema = z.object({
  username: z.string()
    .min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." })
    .max(20, { message: "Kullanıcı adı en fazla 20 karakter olabilir."}),
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
  terms: z.literal<boolean>(true, {
    errorMap: () => ({ message: "Devam etmek için sözleşmeleri kabul etmelisiniz." }),
  }),
});


export default function SignUpForm() {
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [isGoogleLoading, setIsGoogleLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { i18n } = useTranslation();

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
            terms: false,
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
    }

    async function onSubmit(values: z.infer<typeof formSchema>>) {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            // Update Firebase Auth profile immediately with username.
            await updateProfile(user, {
                displayName: values.username,
            });
            
            let ref: string | null = null;
            try {
                const encodedRef = searchParams.get('ref');
                if (encodedRef) {
                    ref = atob(encodedRef);
                }
            } catch (e) {
                console.error("Failed to decode referral code:", e);
                toast({
                    variant: 'destructive',
                    title: 'Geçersiz Davet Kodu',
                    description: 'Kullandığınız davet linki hatalı görünüyor, ancak kayıt işlemine devam edebilirsiniz.'
                });
                ref = null;
            }

            // CRITICAL FIX: Create user document immediately on signup.
            // This guarantees the document exists before the user is redirected to the profile page.
            await updateUserProfile({
                userId: user.uid,
                isNewUser: true, // This flag tells the action to create the document.
                username: values.username,
                email: user.email,
                referredBy: ref,
            });

            if (ref) {
                try {
                    await creditReferrer(ref, { uid: user.uid, username: values.username, photoURL: '' });
                } catch (e) {
                    console.error("Referrer credit failed, but signup continues:", e);
                }
            }
             // Let the AuthProvider handle the redirect. No more manual push.
        } catch (error: any) {
            console.error("Kayıt hatası", error);
            let errorMessage = "Hesap oluşturulurken bilinmeyen bir hata oluştu. Lütfen tekrar deneyin.";
            switch (error.code) {
                case 'auth/email-already-in-use':
                    errorMessage = "Bu e-posta adresi zaten başka bir hesap tarafından kullanılıyor.";
                    form.setError("email", { type: "manual", message: errorMessage });
                    break;
                case 'auth/invalid-email':
                    errorMessage = "Lütfen geçerli bir e-posta adresi girin.";
                    form.setError("email", { type: "manual", message: errorMessage });
                    break;
                case 'auth/weak-password':
                    errorMessage = "Şifre çok zayıf. Lütfen en az 6 karakterli daha güçlü bir şifre seçin.";
                    form.setError("password", { type: "manual", message: errorMessage });
                    break;
                default:
                    console.error(error.message);
            }
            toast({
                title: "Kayıt Başarısız",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20 relative">
                    <CardHeader className="text-center space-y-4 pt-10">
                        <Button asChild variant="outline" size="sm" className="absolute top-4 right-4 rounded-full">
                            <Link href="/guide">
                                <HelpCircle className="mr-2 h-4 w-4"/> Kılavuz
                            </Link>
                        </Button>
                        <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={64} height={64} className="h-16 w-16 mx-auto" />
                        <CardTitle className="text-3xl font-bold">Aramıza Katıl</CardTitle>
                        <CardDescription>
                            Yeni bir hesap oluşturmak için bilgilerinizi girin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading || isGoogleLoading}>
                                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <svg className="mr-2 h-4 w-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 21.2 172.9 61.9l-76.4 64.5c-24.1-22.6-56.3-36.6-96.5-36.6-69.8 0-129.2 53.4-148.9 124.7H99.4v-45.9h.2c22.8-51.1 76.3-86.4 138.6-86.4 53.6 0 98.4 22.2 130.6 54.9l-65.7 64.3H488V261.8z"></path></svg>}
                                Google ile Devam Et
                            </Button>
                             <div className="relative">
                                <Separator className="shrink-0" />
                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 text-xs uppercase text-muted-foreground bg-card">Veya</div>
                            </div>

                            <FormField
                                control={form.control}
                                name="username"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Kullanıcı Adı</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Görünmesini istediğiniz isim" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
                                        <FormLabel>Şifre</FormLabel>
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
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            <FormField
                            control={form.control}
                            name="terms"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                    <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                    <FormLabel>
                                    <Link href="/terms" target="_blank" className="text-primary hover:underline">Kullanıcı Sözleşmesi</Link> ve <Link href="/privacy" target="_blank" className="text-primary hover:underline">Gizlilik Politikasını</Link> okudum ve kabul ediyorum.
                                    </FormLabel>
                                    <FormMessage />
                                </div>
                                </FormItem>
                            )}
                            />

                            <Button type="submit" className="w-full text-lg font-semibold shadow-lg shadow-primary/30 transition-transform hover:scale-105" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                Hesap Oluştur
                            </Button>
                        </div>
                        <div className="mt-6 text-center text-sm">
                            Zaten bir hesabınız var mı?{" "}
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                Giriş Yap
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </form>
        </Form>
    );
}
