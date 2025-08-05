// src/app/reset-password/page.tsx
'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";

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
import { resetPasswordWithCode } from "@/lib/actions/userActions";


const formSchema = z.object({
  code: z.string().min(1, { message: "Doğrulama kodu boş olamaz." }),
  newPassword: z.string().min(6, { message: "Yeni şifre en az 6 karakter olmalıdır." }),
});

export default function ResetPasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            code: searchParams.get('oobCode') || "",
            newPassword: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            const result = await resetPasswordWithCode(values.code, values.newPassword);
            if (result.success) {
                toast({
                    title: "Başarılı!",
                    description: "Şifreniz başarıyla değiştirildi. Şimdi giriş yapabilirsiniz.",
                });
                router.push('/login');
            } else {
                throw new Error(result.error || "Bilinmeyen bir hata oluştu.");
            }
        } catch (error: any) {
            toast({
                title: "Şifre Sıfırlama Başarısız",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <main className="relative flex min-h-screen flex-col items-center justify-center p-4 auth-bg">
            <div className="flex-1 flex flex-col items-center justify-center w-full">
                <Card className="w-full max-w-sm mx-auto shadow-2xl rounded-2xl bg-card/80 backdrop-blur-lg border-white/20">
                    <CardHeader className="text-center space-y-4 pt-10">
                        <Image src="/icons/icon.svg" alt="HiweWalk Logo" width={64} height={64} className="h-16 w-16 mx-auto" />
                        <CardTitle className="text-3xl font-bold">Şifreni Sıfırla</CardTitle>
                        <CardDescription>
                            E-postanıza gelen doğrulama kodunu ve yeni şifrenizi girin.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Doğrulama Kodu</FormLabel>
                                            <FormControl>
                                                <Input placeholder="E-postadaki kod" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="newPassword"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Yeni Şifre</FormLabel>
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
                                <Button type="submit" className="w-full text-lg font-semibold" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                                    Şifreyi Değiştir
                                </Button>
                            </form>
                        </Form>
                        <div className="mt-6 text-center text-sm">
                            <Link href="/login" className="font-semibold text-primary hover:underline">
                                Giriş ekranına geri dön
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
             <footer className="py-4">
                <p className="text-xs text-white/70">
                    © 2025 BeWalk. All rights reserved.
                </p>
            </footer>
        </main>
    );
}
