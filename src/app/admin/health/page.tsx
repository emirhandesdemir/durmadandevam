// src/app/admin/health/page.tsx
'use client';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Activity, ShieldAlert, HeartPulse } from "lucide-react";

const projectId = "yenidendeneme-ea9ed";

const healthLinks = [
  {
    title: "Performans İzleme (APM)",
    description: "Uygulama başlangıç süresi, yavaş ağ istekleri ve özel kod izlemeleri gibi performans metriklerini analiz edin.",
    icon: Activity,
    href: `https://console.firebase.google.com/project/${projectId}/performance`,
  },
  {
    title: "Crashlytics (Hata Raporlama)",
    description: "Uygulamanızdaki çökmeleri ve hataları gerçek zamanlı olarak takip edin, analiz edin ve önceliklendirin.",
    icon: ShieldAlert,
    href: `https://console.firebase.google.com/project/${projectId}/crashlytics`,
  },
];

export default function HealthPage() {
  return (
    <div>
      <div className="flex items-center gap-4">
        <HeartPulse className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Uygulama Sağlığı</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanızın performansını, kararlılığını ve hatalarını izleyin.
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
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {healthLinks.map((link) => (
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
                  Raporları Görüntüle
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
