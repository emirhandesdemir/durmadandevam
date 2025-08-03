// src/components/auth/signup-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
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
import { Loader2, Eye, EyeOff } from "lucide-react";
import { Checkbox } from "../ui/checkbox";
import { useTranslation } from "react-i18next";

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

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            // Update Firebase Auth profile immediately with username.
            await updateProfile(user, {
                displayName: values.username,
            });
            
            let ref: string | null = null;
            const encodedRef = searchParams.get('ref');
            if (encodedRef) {
                try {
                    ref = atob(encodedRef);
                } catch (e) {
                    console.error("Failed to decode referral code:", e);
                    ref = null;
                }
            }

            // Create user profile in Firestore using a server action.
            // This action now also handles generating the uniqueTag.
            await updateUserProfile({
                userId: user.uid,
                isNewUser: true,
                username: values.username,
                email: values.email,
                referredBy: ref,
            });

            if (ref) {
                try {
                    await creditReferrer(ref, { uid: user.uid, username: values.username, photoURL: '' });
                } catch (e) {
                    console.error("Referrer credit failed, but signup continues:", e);
                }
            }
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
        <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center space-y-4 pt-10">
                <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={64} height={64} className="h-16 w-16 mx-auto" />
                <CardTitle className="text-3xl font-bold">Aramıza Katıl</CardTitle>
                <CardDescription>
                    Yeni bir hesap oluşturmak için bilgilerinizi girin.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                    </form>
                </Form>
                <div className="mt-6 text-center text-sm">
                    Zaten bir hesabınız var mı?{" "}
                    <Link href="/login" className="font-semibold text-primary hover:underline">
                        Giriş Yap
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}
