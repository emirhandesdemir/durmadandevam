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
import { LogOut, User } from "lucide-react";

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
    
    // In a real app, you would handle profile updates here
    const handleSaveChanges = () => {
        toast({
            title: "Yakında Gelecek!",
            description: "Profil güncelleme özelliği henüz aktif değil.",
        });
    }

    if (loading || !user) {
        return null;
    }

    return (
        <Card className="w-full max-w-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <User className="h-6 w-6" />
                    Profil Ayarları
                </CardTitle>
                <CardDescription>
                    Profil bilgilerinizi buradan görüntüleyebilir ve güncelleyebilirsiniz.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={user.photoURL || undefined} />
                        <AvatarFallback className="text-3xl">
                            {user.displayName?.charAt(0).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h3 className="text-xl font-bold">{user.displayName}</h3>
                        <p className="text-muted-foreground">{user.email}</p>
                    </div>
                </div>
                
                <Separator />

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="username">Kullanıcı Adı</Label>
                        <Input id="username" defaultValue={user.displayName || ""} />
                    </div>
                     <div>
                        <Label htmlFor="picture">Profil Fotoğrafı</Label>
                        <Input id="picture" type="file" disabled />
                        <p className="text-xs text-muted-foreground mt-1">Bu özellik yakında gelecek.</p>
                    </div>
                </div>

            </CardContent>
            <CardFooter className="flex justify-between">
                <Button onClick={handleLogout} variant="outline">
                    <LogOut className="mr-2" />
                    Çıkış Yap
                </Button>
                <Button onClick={handleSaveChanges}>Değişiklikleri Kaydet</Button>
            </CardFooter>
        </Card>
    );
}
