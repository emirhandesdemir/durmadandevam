// src/components/auth/signup-form.tsx
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
import { Loader2, Eye, EyeOff, Swords } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";

const formSchema = z.object({
  username: z.string().min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." }).max(20, { message: "Kullanıcı adı en fazla 20 karakter olabilir."}),
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
  gender: z.enum(['male', 'female'], { required_error: "Cinsiyet seçimi zorunludur." }),
});

const generateDefaultAvatar = (username: string) => {
    const getHash = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash |= 0;
        }
        return Math.abs(hash);
    };

    const hash = getHash(username);
    const hue = hash % 360;
    const saturation = 70 + (hash % 10); 
    const lightness = 45 + (hash % 10);
    const lightness2 = lightness + 15;

    const svg = `
<svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="200" height="200" fill="url(#gradient)"/>
<defs>
<radialGradient id="gradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
<stop offset="0%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness2}%);stop-opacity:1" />
<stop offset="100%" style="stop-color:hsl(${hue}, ${saturation}%, ${lightness}%);stop-opacity:1" />
</radialGradient>
</defs>
</svg>`.replace(/\n/g, "").replace(/\s+/g, " ");

    return `data:image/svg+xml;base64,${btoa(svg)}`;
};


export default function SignUpForm() {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);


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
            
            const defaultAvatarUrl = generateDefaultAvatar(values.username);

            await updateProfile(user, {
                displayName: values.username,
                photoURL: defaultAvatarUrl,
            });
            
            const isAdminEmail = values.email === 'admin@example.com';
            const userRole = isAdminEmail ? 'admin' : 'user';

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: values.username,
                email: values.email,
                photoURL: defaultAvatarUrl,
                bio: "",
                role: userRole,
                gender: values.gender,
                createdAt: serverTimestamp(),
                diamonds: 10, // Start with 10 diamonds
                postCount: 0, // Initialize post count
                followers: [],
                following: [],
                privateProfile: false,
                acceptsFollowRequests: true,
                followRequests: [],
                selectedBubble: '',
                selectedAvatarFrame: '',
            });

            toast({
                title: "Hesap Oluşturuldu!",
                description: "Uygulamaya hoş geldin!",
            });
            
            router.push('/home');

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
        <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20">
            <CardHeader className="text-center space-y-4">
                 <Swords className="mx-auto h-12 w-12 text-primary" />
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
                                        <Input placeholder="hiwewalker" {...field} />
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
                          name="gender"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel>Cinsiyet</FormLabel>
                              <FormControl>
                                <RadioGroup
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                  className="flex space-x-4 pt-1"
                                >
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="male" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      Erkek
                                    </FormLabel>
                                  </FormItem>
                                  <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                      <RadioGroupItem value="female" />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer">
                                      Kadın
                                    </FormLabel>
                                  </FormItem>
                                </RadioGroup>
                              </FormControl>
                              <FormMessage />
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
