// src/app/(main)/home/page.tsx
"use client";

import PostsFeed from "@/components/posts/PostsFeed";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MailCheck } from "lucide-react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Tüm kullanıcıların gönderilerini tek bir akışta sunar.
 */
export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const { toast } = useToast();

  const handleSendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      toast({
          title: "Doğrulama E-postası Gönderildi",
          description: "Lütfen e-posta kutunuzu kontrol edin ve linke tıklayarak hesabınızı doğrulayın.",
          duration: 7000,
      });
    } catch (error: any) {
      toast({
          variant: 'destructive',
          title: "Hata",
          description: `E-posta gönderilemedi: ${error.message}`
      });
    }
  };
  
  const showVerificationCard = userData && !userData.emailVerified && !userData.emailVerificationAwarded;

  return (
    <div className="min-h-screen bg-background text-foreground pt-4">
        <div className="flex flex-col items-center gap-4">
            {showVerificationCard && (
               <div className="w-full px-4">
                 <Card className="bg-secondary">
                   <CardHeader>
                     <CardTitle className="flex items-center gap-2">
                       <MailCheck className="h-6 w-6 text-primary" />
                       E-postanı Doğrula!
                     </CardTitle>
                     <CardDescription>
                       Hesabını doğrulayarak 15 elmas kazan ve hesabının güvenliğini artır.
                     </CardDescription>
                   </CardHeader>
                   <CardContent>
                     <Button onClick={handleSendVerification} className="w-full">
                       Doğrulama E-postası Gönder
                     </Button>
                   </CardContent>
                 </Card>
               </div>
            )}
            <PostsFeed />
        </div>
    </div>
  );
}
