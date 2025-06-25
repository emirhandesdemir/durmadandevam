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
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { LogOut, User, Edit } from "lucide-react";

export default function ProfilePageClient() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            toast({
                title: "Oturum Kapatıldı",
                description: "Başarıyla çıkış yaptınız.",
            });
            router.push('/login');
        } catch (error) {
            console.error("Logout error", error);
            toast({
                title: "Hata",
                description: "Çıkış yapılırken bir hata oluştu.",
                variant: "destructive",
            });
        }
    };
    
    const handleSaveChanges = () => {
        toast({
            title: "Yakında Gelecek!",
            description: "Profil güncelleme özelliği henüz aktif değil.",
        });
    }

    if (loading || !user) {
        return null; // or a loading skeleton
    }

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
                <CardTitle className="text-3xl font-bold mt-4">{user.displayName}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 px-8">
                <Separator />
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="username">Kullanıcı Adı</Label>
                        <Input id="username" defaultValue={user.displayName || ""} className="rounded-full" />
                    </div>
                </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row justify-between gap-4 p-8">
                <Button onClick={handleLogout} variant="outline" className="w-full sm:w-auto rounded-full">
                    <LogOut className="mr-2" />
                    Çıkış Yap
                </Button>
                <Button onClick={handleSaveChanges} className="w-full sm:w-auto rounded-full shadow-lg shadow-primary/30 transition-transform hover:scale-105">
                    Değişiklikleri Kaydet
                </Button>
            </CardFooter>
        </Card>
    );
}
