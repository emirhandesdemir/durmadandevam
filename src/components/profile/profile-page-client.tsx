
"use client";

import { useAuth } from "@/contexts/AuthContext";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Edit, Shield, BadgeCheck, Palette, Sun, Moon, Laptop } from "lucide-react";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { useTheme } from "next-themes";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";


export default function ProfilePageClient() {
    const { user, userData, loading, handleLogout } = useAuth();
    const { toast } = useToast();
    const { theme, setTheme } = useTheme();
    
    const handleSaveChanges = () => {
        toast({
            title: "Yakında Gelecek!",
            description: "Profil güncelleme özelliği henüz aktif değil.",
        });
    }

    if (loading || !user) {
        return null; // or a loading skeleton
    }

    const isAdmin = userData?.role === 'admin';

    return (
        <Card className="w-full max-w-lg shadow-xl rounded-3xl border-0">
            <CardHeader className="items-center text-center pt-8">
                <div className="relative">
                    <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="text-5xl bg-primary/20">
                            {user.displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                     <Button size="icon" variant="outline" className="absolute -bottom-2 -right-2 rounded-full h-10 w-10 border-2 border-background bg-card">
                        <Edit className="h-5 w-5" />
                     </Button>
                </div>
                <div className="flex items-center gap-2 mt-4">
                    <CardTitle className="text-3xl font-bold">{user.displayName}</CardTitle>
                    {isAdmin && (
                         <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                     <BadgeCheck className="h-7 w-7 text-primary fill-primary/30" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Yönetici Hesabı</p>
                                </TooltipContent>
                            </Tooltip>
                         </TooltipProvider>
                    )}
                </div>
                <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8">
                 <div className="space-y-4">
                    <div>
                        <Label htmlFor="username">Kullanıcı Adı</Label>
                        <Input id="username" defaultValue={user.displayName || ""} className="rounded-full" />
                    </div>
                </div>
                <Separator />
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                         <Palette className="h-5 w-5 text-muted-foreground" />
                         <Label>Görünüm</Label>
                    </div>
                     <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-2">
                        <Label htmlFor="light-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="light" id="light-theme" className="sr-only" />
                        <Sun className="mb-2 h-6 w-6" />
                        <span className="text-xs font-bold">Aydınlık</span>
                        </Label>

                        <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
                        <Moon className="mb-2 h-6 w-6" />
                        <span className="text-xs font-bold">Karanlık</span>
                        </Label>
                        
                        <Label htmlFor="system-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                        <RadioGroupItem value="system" id="system-theme" className="sr-only" />
                        <Laptop className="mb-2 h-6 w-6" />
                        <span className="text-xs font-bold">Sistem</span>
                        </Label>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="flex flex-wrap justify-center gap-4 p-8">
                <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto rounded-full">
                    <LogOut className="mr-2" />
                    Çıkış Yap
                </Button>
                {isAdmin && (
                    <Button asChild className="w-full sm:w-auto rounded-full bg-blue-600 hover:bg-blue-700">
                        <Link href="/admin/dashboard">
                            <Shield className="mr-2" />
                            Yönetim Paneli
                        </Link>
                    </Button>
                )}
                <Button onClick={handleSaveChanges} className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105">
                    Değişiklikleri Kaydet
                </Button>
            </CardFooter>
        </Card>
    );
}
