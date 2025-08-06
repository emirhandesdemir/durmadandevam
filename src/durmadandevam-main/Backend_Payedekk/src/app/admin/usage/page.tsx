// src/app/admin/usage/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Database, HardDrive, Server } from "lucide-react";

// Project ID'yi firebase.ts'den almak yerine doğrudan burada tanımlayabiliriz.
// Gerçek bir uygulamada bu bir ortam değişkeninden gelebilirdi.
const projectId = "yenidendeneme-ea9ed";

const usageLinks = [
  {
    title: "Firestore Veritabanı Kullanımı",
    description: "Okuma, yazma ve silme işlemlerini, belge sayılarını ve depolanan veri miktarını takip edin.",
    icon: Database,
    href: `https://console.firebase.google.com/project/${projectId}/firestore/usage`,
  },
  {
    title: "Storage (Depolama) Kullanımı",
    description: "Yüklenen dosyaların toplam boyutunu, indirme trafiğini ve depolama istatistiklerini görüntüleyin.",
    icon: HardDrive,
    href: `https://console.firebase.google.com/project/${projectId}/storage/usage`,
  },
  {
    title: "Hosting Trafiği ve Kullanımı",
    description: "Uygulamanızın ne kadar trafik aldığını, veri transferini ve hosting istatistiklerini inceleyin.",
    icon: Server,
    href: `https://console.firebase.google.com/project/${projectId}/hosting/usage`,
  },
];

export default function UsagePage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <Database className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Kullanım & Trafik</h1>
          <p className="text-muted-foreground mt-1">
            Firebase projenizin kaynak kullanımını ve maliyetlerini takip edin.
          </p>
        </div>
      </div>
      <Card className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <CardHeader>
            <CardTitle className="text-blue-900 dark:text-blue-200">Önemli Not</CardTitle>
        </CardHeader>
        <CardContent className="text-blue-800 dark:text-blue-300">
            <p>Bu veriler doğrudan Firebase Konsolu üzerinden sağlanmaktadır. Gerçek zamanlı ve detaylı istatistikler için ilgili Firebase sayfasına yönlendirileceksiniz.</p>
        </CardContent>
      </Card>
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {usageLinks.map((link) => (
          <Card key={link.title} className="flex flex-col">
            <CardHeader>
              <div className="flex items-center gap-4">
                <link.icon className="h-8 w-8 text-primary" />
                <CardTitle>{link.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <CardDescription>{link.description}</CardDescription>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  Konsolda Görüntüle
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
