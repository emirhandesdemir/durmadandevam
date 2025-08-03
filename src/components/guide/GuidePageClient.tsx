// src/components/guide/GuidePageClient.tsx
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Compass, Diamond, Gift, HelpCircle, Palette, PenSquare, Shield, Users, Mic, MessageSquare } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

const guideSections = [
    {
        title: "Temel Özellikler",
        icon: Compass,
        items: [
            { title: "Gönderi Paylaşma", description: "Ana sayfada metin veya fotoğraf içeren gönderiler paylaşabilirsiniz. 'Oluştur' sekmesinden yeni gönderi oluşturma sayfasına gidebilirsiniz." },
            { title: "Sohbet Odaları", description: "Farklı konulardaki sohbet odalarına katılabilir veya kendi odanızı oluşturabilirsiniz. Odalar, belirli bir süre sonra otomatik olarak kapanır." },
            { title: "Surf Akışı", description: "Kısa videolarınızı paylaşabileceğiniz ve diğer kullanıcıların videolarını keşfedebileceğiniz tam ekran bir video akışıdır." },
            { title: "Direkt Mesajlar", description: "Diğer kullanıcılarla özel olarak mesajlaşabilirsiniz. Profil sayfalarındaki 'Mesaj Gönder' butonu ile yeni bir sohbet başlatın." },
        ]
    },
    {
        title: "Oda Seviye Sistemi",
        icon: Users,
        items: [
            { title: "XP Nasıl Kazanılır?", description: "Odanız, içinde sesli sohbete katılan aktif kullanıcı sayısı ile orantılı olarak her 5 dakikada bir otomatik olarak XP (deneyim puanı) kazanır. Ayrıca, odaya atılan her hediye, elmas değeri kadar XP kazandırır." },
            { title: "Seviye Atlamanın Faydaları", description: "Seviye atlayan odalar, liderlik tablosunda daha üst sıralarda yer alır ve daha fazla kullanıcı tarafından keşfedilir. Gelecekte seviyeye özel yeni özellikler eklenecektir." },
            { title: "Oda Sahibi Olarak Hediye Gönderme", description: "Oda sahipleri de dahil olmak üzere herkes, 'Odaya' hediye göndererek odanın XP'sine doğrudan katkıda bulunabilir." },
        ]
    },
    {
        title: "Elmas & Hediyeler",
        icon: Diamond,
        items: [
            { title: "Elmas Kazanma", description: "Reklam izleyerek, arkadaşlarınızı davet ederek veya hediye alarak elmas kazanabilirsiniz. İlk gönderi ve profil tamamlama gibi görevler de elmas kazandırır." },
            { title: "Hediye Gönderme", description: "Sohbet odalarında diğer kullanıcılara veya doğrudan odaya hediye gönderebilirsiniz. Gönderilen hediyeler, alıcının 'profil değerini' veya odanın 'XP'sini artırır." },
            { title: "Profil Değeri", description: "Size gönderilen hediyelerin toplam elmas değeridir. Bu değeri, cüzdan sayfanızdan %70 oranında elmasa dönüştürebilirsiniz." },
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
        title: "Hesap ve Profil",
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

export default function GuidePageClient() {
  return (
    <div className="relative min-h-screen bg-background">
       <div className="absolute top-0 left-0 w-full h-48 bg-gradient-to-b from-primary/20 to-transparent -z-10" />
      <div className="container mx-auto max-w-4xl py-6 px-4">
        <div className="flex items-center gap-4 mb-8">
            <Button asChild variant="outline" size="icon" className="h-9 w-9 rounded-full">
                <Link href="/profile"><ChevronLeft className="h-5 w-5"/></Link>
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
