// src/components/guide/GuidePageClient.tsx
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Compass, Diamond, Gift, HelpCircle, Palette, PenSquare, Shield, Users, Mic, MessageSquare, KeyRound, UserPlus } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";

interface GuidePageClientProps {
  isPublicPage: boolean;
}

const guideSections = [
    {
        title: "Başlarken: Hesap İşlemleri",
        icon: UserPlus,
        items: [
            { title: "Kayıt Olma ve Giriş Yapma", description: "Uygulamaya e-posta adresiniz ve belirleyeceğiniz bir şifre ile kolayca kayıt olabilirsiniz. Giriş ekranından 'Hemen Kayıt Ol' seçeneğini kullanın." },
            { title: "Oda Oluşturma", description: "Uygulamada oda oluşturmak tamamen ücretsizdir. İstediğiniz kadar oda açabilir ve arkadaşlarınızla sohbet edebilirsiniz." },
            { title: "E-posta Doğrulama", description: "Hesap güvenliğiniz için e-postanızı doğrulamanız önemlidir. Ayarlar -> Hesap Güvenliği menüsünden doğrulama e-postasını tekrar gönderebilirsiniz." },
            { title: "Şifre Değiştirme", description: "Şifrenizi unuttuysanız giriş ekranındaki 'Şifremi Unuttum' linkini, mevcut şifrenizi değiştirmek isterseniz Ayarlar -> Hesap Güvenliği menüsündeki 'Şifremi Değiştir' butonunu kullanabilirsiniz." },
        ]
    },
    {
        title: "Temel Özellikler",
        icon: Compass,
        items: [
            { title: "Gönderi Paylaşma", description: "Ana sayfada metin veya fotoğraf içeren gönderiler paylaşabilirsiniz. 'Oluştur' sekmesinden yeni gönderi oluşturma sayfasına gidebilirsiniz." },
            { title: "Sohbet Odaları", description: "Farklı konulardaki sohbet odalarına katılabilir veya kendi odanızı oluşturabilirsiniz. Odalar, belirli bir süre sonra otomatik olarak kapanır." },
            { title: "Direkt Mesajlar", description: "Diğer kullanıcılarla özel olarak mesajlaşabilirsiniz. Profil sayfalarındaki 'Mesaj Gönder' butonu ile yeni bir sohbet başlatın." },
        ]
    },
    {
        title: "Cüzdan & Ekonomi",
        icon: Diamond,
        items: [
            { title: "Elmas Nasıl Kazanılır?", description: "Mağaza sayfasından reklam izleyerek, arkadaşlarınızı davet linkinizle üye yaparak, ilk gönderinizi paylaşarak veya profilinizi tamamlayarak elmas kazanabilirsiniz." },
            { title: "Hediye Gönderme ve Alma", description: "Sohbet odalarında diğer kullanıcılara veya doğrudan odaya hediye gönderebilirsiniz. Size gönderilen hediyeler, 'Profil Değerinizi' artırır." },
            { title: "Hediye Gönderme Kuralı", description: "Diğer kullanıcılara doğrudan hediye gönderebilmek için en az 3. Hediye Seviyesine ulaşmanız gerekir. Ancak, odaya hediye göndermek için bir seviye kısıtlaması yoktur." },
            { title: "Profil Değerini Elmasa Çevirme", description: "Profilinize gönderilen hediyelerin toplam değeri, 'Profil Değeri' olarak birikir. Bu değeri, Cüzdan sayfanızdan %70 oranında elmasa dönüştürerek harcanabilir bakiye elde edebilirsiniz." },
        ]
    },
    {
        title: "Oda Seviye Sistemi ve Popülerlik",
        icon: Users,
        items: [
            { title: "XP Nasıl Kazanılır?", description: "Odanız, içinde sesli sohbete katılan aktif kullanıcı sayısı ile orantılı olarak her 5 dakikada bir otomatik olarak XP (deneyim puanı) kazanır. Ayrıca, odaya atılan her hediye, elmas değeri kadar XP kazandırır." },
            { title: "Seviye Atlamanın Faydaları", description: "Seviye atlayan odalar, liderlik tablosunda daha üst sıralarda yer alır ve daha fazla kullanıcı tarafından keşfedilir. Gelecekte seviyeye özel yeni özellikler eklenecektir." },
            { title: "Odanı Nasıl Öne Çıkarırsın?", description: "Odanızı daha popüler yapmak için, oda ayarlarından 'Portal Aç' özelliğini kullanabilirsiniz. Bu, odanızı 5 dakika boyunca diğer tüm odalarda duyurur ve kullanıcıların tek tıkla katılmasına olanak tanır. Bu işlem 100 elmas gerektirir." },
            { title: "Oda Sahibi Olarak Hediye Gönderme", description: "Oda sahipleri de dahil olmak üzere herkes, 'Odaya' hediye göndererek odanın XP'sine doğrudan katkıda bulunabilir." },
        ]
    },
     {
        title: "Yönetici Komutları (Oda Sahibi/Moderatör)",
        icon: Shield,
        items: [
            { title: "+temizle", description: "Sohbet alanına bu komutu yazdığınızda, odadaki tüm kullanıcı mesajları (sistem mesajları hariç) temizlenir. Bu, sohbeti düzenli tutmak için kullanışlıdır." },
            { title: "+duyuru [mesajınız]", description: "Bu komutla, odanın en üstüne sabitlenen, dikkat çekici bir duyuru mesajı yayınlayabilirsiniz. Örnek: '+duyuru Herkes hoş geldi!'." },
        ]
    },
    {
        title: "Hesap ve Profil Ayarları",
        icon: Palette,
        items: [
            { title: "Profil Güncelleme", description: "Ayarlar sayfasından kullanıcı adı, biyografi, yaş, cinsiyet, ilgi alanları gibi bilgilerinizi güncelleyebilirsiniz." },
            { title: "Gizlilik Ayarları", description: "Hesabınızı 'Gizli' olarak ayarlayabilir, takip isteklerini yönetebilir ve çevrimiçi durumunuzu gizleyebilirsiniz." },
            { title: "Avatar ve Görünüm", description: "Ayarlar altından sohbet baloncuk stilinizi seçebilir veya Avatar Stüdyosu'na giderek profil resminizi değiştirebilirsiniz." },
            { title: "Kullanıcı Engelleme", description: "İstemediğiniz kullanıcıları profillerindeki menüden engelleyebilirsiniz. Engellenen kullanıcıların listesini Ayarlar -> Güvenlik bölümünde bulabilirsiniz." },
        ]
    },
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut",
    },
  }),
};

export default function GuidePageClient({ isPublicPage }: GuidePageClientProps) {
  const router = useRouter();
  
  const handleBack = () => {
    if (isPublicPage) {
      router.back();
    } else {
      router.push('/profile');
    }
  }

  return (
    <div className="relative min-h-screen bg-background">
       <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary/20 to-transparent -z-10" />
      <div className="container mx-auto max-w-4xl py-6 px-4">
        <div className="flex items-center gap-4 mb-8">
            <Button onClick={handleBack} variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <ChevronLeft className="h-5 w-5"/>
            </Button>
            <div className="flex items-center gap-3">
                <HelpCircle className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold tracking-tight">Uygulama Kılavuzu</h1>
            </div>
        </div>
        
        <Accordion type="multiple" className="w-full space-y-4">
            {guideSections.map((section, index) => (
                 <motion.div
                    key={section.title}
                    custom={index}
                    initial="hidden"
                    animate="visible"
                    variants={cardVariants}
                >
                    <AccordionItem value={`item-${index}`} asChild>
                         <Card className="overflow-hidden">
                            <AccordionTrigger className="p-4 hover:no-underline hover:bg-muted/50">
                                <div className="flex items-center gap-4">
                                    <section.icon className="h-6 w-6 text-primary" />
                                    <span className="text-lg font-semibold">{section.title}</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="p-4 pt-0">
                                <div className="space-y-4 pl-10">
                                {section.items.map(item => (
                                    <div key={item.title}>
                                        <h4 className="font-semibold">{item.title}</h4>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                ))}
                                </div>
                            </AccordionContent>
                        </Card>
                    </AccordionItem>
                </motion.div>
            ))}
        </Accordion>
      </div>
    </div>
  );
}
