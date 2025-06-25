// src/app/admin/dashboard/page.tsx
// Bu bileşen, Admin Paneli'nin ana başlangıç sayfasıdır.
// Uygulama ile ilgili genel istatistikleri (toplam kullanıcı, oda sayısı vb.) kartlar halinde gösterir.

import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle, Palette, Settings } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Yönetim Paneli
      </h1>
      <p className="text-muted-foreground mt-1">
        Uygulamanın genel durumuna hoş geldiniz.
      </p>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
        <StatCard title="Toplam Kullanıcı" value="1,234" icon={Users} />
        <StatCard title="Aktif Odalar" value="56" icon={MessageSquare} />
        <StatCard title="Toplam Gönderi" value="8,912" icon={FileText} />
        <StatCard title="Quiz Soruları" value="78" icon={Puzzle} />
      </div>

       {/* Hızlı Erişim Kartları */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Yönetim Araçları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
           <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Palette className="w-6 h-6 text-primary"/>
                        Tema Ayarları
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Uygulamanın renklerini, modlarını (karanlık/aydınlık) ve genel görünümünü özelleştirin.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/theme">Temayı Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Settings className="w-6 h-6 text-primary"/>
                        Sistem Ayarları
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                       Oda kapasitesi, günlük limitler gibi genel uygulama ayarlarını yapılandırın.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/system">Ayarları Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </div>
  );
}

// Ekstra bileşenler (normalde ui klasöründe olur ama burada örnek için)
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
