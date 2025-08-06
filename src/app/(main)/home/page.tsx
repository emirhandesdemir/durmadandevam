// src/app/(main)/home/page.tsx
"use client";

import PostsFeed from "@/components/posts/PostsFeed";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { MailCheck, X } from "lucide-react";
import { sendEmailVerification } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

/**
 * Ana Sayfa (Home Page)
 * 
 * Uygulamanın ana giriş sayfasıdır. Kullanıcı giriş yaptıktan sonra bu sayfayı görür.
 * Tüm kullanıcıların gönderilerini tek bir akışta sunar.
 */
export default function HomePage() {
  const { user, userData, loading } = useAuth();
  const { toast } = useToast();
  const [showVerification, setShowVerification] = useState(false);

  useEffect(() => {
    // Only show the card if the user hasn't dismissed it in the current session.
    if (userData && !userData.emailVerified && !userData.emailVerificationAwarded && sessionStorage.getItem('dismissedVerificationCard') !== 'true') {
      setShowVerification(true);
    } else {
      setShowVerification(false);
    }
  }, [userData]);


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
  
  const handleDismiss = () => {
    sessionStorage.setItem('dismissedVerificationCard', 'true');
    setShowVerification(false);
  }

  return (
    <div className="min-h-screen bg-background text-foreground pt-4">
        <div className="flex flex-col items-center gap-4">
            {showVerification && (
               <div className="w-full px-4">
                 <Card className="bg-secondary relative">
                    <Button onClick={handleDismiss} variant="ghost" size="icon" className="absolute top-2 right-2 h-7 w-7 rounded-full">
                        <X className="h-4 w-4" />
                    </Button>
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
