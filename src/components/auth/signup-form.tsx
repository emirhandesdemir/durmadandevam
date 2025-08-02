// src/components/auth/signup-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { creditReferrer } from "@/lib/actions/diamondActions";
import { findUserByUsername } from "@/lib/server-utils";
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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { Checkbox } from "../ui/checkbox";
import { countries } from "@/lib/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useTranslation } from "react-i18next";
import { emojiToDataUrl } from "@/lib/utils";

const formSchema = z.object({
  username: z.string()
    .min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." })
    .max(20, { message: "Kullanıcı adı en fazla 20 karakter olabilir."})
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir." }),
  email: z.string().email({ message: "Geçersiz e-posta adresi." }),
  password: z.string().min(6, { message: "Şifre en az 6 karakter olmalıdır." }),
  gender: z.enum(['male', 'female'], { required_error: "Cinsiyet seçimi zorunludur." }),
  country: z.string({ required_error: "Ülke seçimi zorunludur." }),
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
            const existingUser = await findUserByUsername(values.username);
            if (existingUser) {
                toast({
                    title: "Kullanıcı Adı Alınmış",
                    description: "Bu kullanıcı adı zaten başka birisi tarafından kullanılıyor. Lütfen farklı bir tane seçin.",
                    variant: "destructive",
                });
                 form.setError("username", {
                    type: "manual",
                    message: "Bu kullanıcı adı zaten alınmış.",
                });
                setIsLoading(false);
                return;
            }

            const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
            const user = userCredential.user;
            
            const defaultAvatarUrl = emojiToDataUrl('🙂');

            await updateProfile(user, {
                displayName: values.username,
                photoURL: defaultAvatarUrl,
            });
            
            const isAdminEmail = values.email === 'admin@example.com';
            const userRole = isAdminEmail ? 'admin' : 'user';
            
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

            const preferredLanguage = values.country === "TR" ? 'tr' : 'en';

            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: values.username,
                username_lowercase: values.username.toLowerCase(),
                photoURL: defaultAvatarUrl,
                bio: null,
                age: null,
                city: null,
                country: values.country,
                gender: values.gender,
                interests: [],
                role: userRole,
                createdAt: serverTimestamp(),
                lastActionTimestamp: serverTimestamp(),
                diamonds: 10,
                referredBy: ref || null,
                referralCount: 0,
                postCount: 0,
                followers: [],
                following: [],
                blockedUsers: [],
                savedPosts: [],
                hiddenPostIds: [],
                privateProfile: false,
                acceptsFollowRequests: true,
                followRequests: [],
                selectedBubble: '',
                selectedAvatarFrame: '',
                isBanned: false,
                reportCount: 0,
                isOnline: true,
                lastSeen: serverTimestamp(),
                premiumUntil: null,
                isFirstPremium: false,
                unlimitedRoomCreationUntil: null,
                profileCompletionNotificationSent: false,
            });

            if (ref) {
                try {
                    await creditReferrer(ref, { uid: user.uid, username: values.username, photoURL: defaultAvatarUrl });
                } catch (e) {
                    console.error("Referrer credit failed, but signup continues:", e);
                }
            }

            i18n.changeLanguage(preferredLanguage);
            // SUCCESS: Let AuthProvider handle the redirect after userData is loaded.
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
                                        <Input placeholder="kullanici_adi" {...field} />
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
                          name="country"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Ülke</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Bir ülke seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {countries.map(country => (
                                      <SelectItem key={country.code} value={country.code}>{country.name}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
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
