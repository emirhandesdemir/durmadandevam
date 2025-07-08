// src/app/admin/status/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Activity, ShieldAlert, HeartPulse, Server, Database, HardDrive, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { checkSystemHealth, type HealthCheckResult } from '@/lib/actions/healthActions';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

const projectId = "yenidendeneme-ea9ed";

const deepDiveLinks = [
  {
    title: "Performans İzleme (APM)",
    description: "Uygulama hızı, ağ istekleri ve özel kod izlemeleri gibi performans metriklerini analiz edin.",
    icon: Activity,
    href: `https://console.firebase.google.com/project/${projectId}/performance`,
  },
  {
    title: "Crashlytics (Hata Raporlama)",
    description: "Uygulamanızdaki çökmeleri ve hataları gerçek zamanlı olarak takip edin, analiz edin ve önceliklendirin.",
    icon: ShieldAlert,
    href: `https://console.firebase.google.com/project/${projectId}/crashlytics`,
  },
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
];

export default function StatusPage() {
  const [healthStatus, setHealthStatus] = useState<HealthCheckResult[]>([]);
  const [loading, setLoading] = useState(true);

  const runHealthCheck = () => {
    setLoading(true);
    checkSystemHealth().then(results => {
      setHealthStatus(results);
      setLoading(false);
    });
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div>
      <div className="flex items-center gap-4">
        <HeartPulse className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistem Durumu</h1>
          <p className="text-muted-foreground mt-1">
            Servislerin canlı durumunu kontrol edin ve detaylı analizler için Firebase Konsolu'na gidin.
          </p>
        </div>
      </div>
      
      <Card className="mt-8">
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                 <CardTitle>Canlı Servis Kontrolü</CardTitle>
                <CardDescription>Temel servislerin anlık bağlantı durumları.</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={runHealthCheck} disabled={loading}>
                 {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                Yenile
            </Button>
        </CardHeader>
        <CardContent>
            {loading ? (
                <div className="flex items-center gap-4 p-4">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <p className="text-muted-foreground">Servisler kontrol ediliyor...</p>
                </div>
            ) : (
                 <div className="space-y-4">
                    {healthStatus.map((service) => (
                        <div key={service.service} className="flex items-center justify-between rounded-lg border p-4">
                            <div className="flex items-center gap-3">
                                {service.status === 'ok' ? (
                                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                                ) : (
                                    <AlertCircle className="h-6 w-6 text-destructive" />
                                )}
                                <div>
                                    <p className="font-semibold">{service.service}</p>
                                    <p className="text-xs text-muted-foreground">{service.details}</p>
                                </div>
                            </div>
                            <div className={cn(
                                "text-sm font-bold",
                                service.status === 'ok' ? 'text-green-600' : 'text-destructive'
                            )}>
                                {service.status === 'ok' ? 'Çalışıyor' : 'Hata'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </CardContent>
      </Card>

      <Separator className="my-8" />
      
      <div>
         <h2 className="text-2xl font-bold tracking-tight">Detaylı Analiz & Kullanım</h2>
          <p className="text-muted-foreground mt-1">
             Bu istatistikler, en doğru ve güncel verileri sağlayan Firebase Konsolu'nda daha detaylı olarak mevcuttur.
          </p>
      </div>
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {deepDiveLinks.map((link) => (
          <Card key={link.title} className="flex flex-col hover:border-primary/50 transition-colors">
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
              <Button asChild className="w-full" variant="secondary">
                <a href={link.href} target="_blank" rel="noopener noreferrer">
                  Firebase Konsolunda Aç
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
