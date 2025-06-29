// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle, Headphones, BarChart3, SlidersHorizontal, Settings, Database, HeartPulse } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { VoiceStats } from "@/lib/types";

export default function DashboardPage() {
  // Veri sayımları ve yükleme durumu için state'ler
  const [userCount, setUserCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [voiceUserCount, setVoiceUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore'dan verileri anlık olarak dinlemek için useEffect
  useEffect(() => {
    setIsLoading(true);

    const unsubscribers = [
        onSnapshot(collection(db, "users"), (snapshot) => setUserCount(snapshot.size)),
        onSnapshot(collection(db, "rooms"), (snapshot) => setRoomCount(snapshot.size)),
        onSnapshot(collection(db, "posts"), (snapshot) => setPostCount(snapshot.size)),
        onSnapshot(collection(db, "game_questions"), (snapshot) => setQuestionCount(snapshot.size)),
        onSnapshot(doc(db, "config", "voiceStats"), (doc) => {
            if (doc.exists()) {
                setVoiceUserCount((doc.data() as VoiceStats).totalUsers || 0);
            }
        }),
    ];

    // Tüm dinleyiciler kurulduktan bir süre sonra yükleme durumunu false yap
    const timer = setTimeout(() => setIsLoading(false), 800);

    // Component unmount olduğunda dinleyicileri ve zamanlayıcıyı temizle
    return () => {
        unsubscribers.forEach(unsub => unsub());
        clearTimeout(timer);
    };
  }, []);

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
        <StatCard title="Toplam Kullanıcı" value={userCount} icon={Users} isLoading={isLoading} />
        <StatCard title="Aktif Odalar" value={roomCount} icon={MessageSquare} isLoading={isLoading} />
        <StatCard title="Toplam Gönderi" value={postCount} icon={FileText} isLoading={isLoading} />
        <StatCard title="Sesli Aktif Kullanıcı" value={voiceUserCount} icon={Headphones} isLoading={isLoading} />
      </div>

       {/* Hızlı Erişim Kartları */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Yönetim Araçları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
           <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Users className="w-6 h-6 text-primary"/>
                        Kullanıcı Yönetimi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Kullanıcıları görüntüleyin, rollerini değiştirin veya hesaplarını yönetin.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/users">Kullanıcıları Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <MessageSquare className="w-6 h-6 text-primary"/>
                        Oda Yönetimi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                       Aktif odaları görüntüleyin, sohbetleri izleyin veya odaları kapatın.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/rooms">Odaları Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-primary"/>
                        Gönderi Yönetimi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                       Kullanıcı gönderilerini görüntüleyin veya yayından kaldırın.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/posts">Gönderileri Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Puzzle className="w-6 h-6 text-primary"/>
                        Quiz Soru Yönetimi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Oyun için yeni sorular ekleyin, düzenleyin veya silin. Toplam: {questionCount}
                    </p>
                </CardContent>
                <CardFooter>
                     <Button asChild variant="outline">
                        <Link href="/admin/questions">Soruları Yönet</Link>
                    </Button>
                </CardFooter>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-primary"/>
                        İstatistikler
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Kullanıcı büyümesi ve etkileşim gibi metrikleri görselleştirin.
                    </p>
                </CardContent>
                <CardFooter>
                     <Button asChild variant="outline">
                        <Link href="/admin/analytics">Analizi Görüntüle</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <HeartPulse className="w-6 h-6 text-primary"/>
                        Uygulama Sağlığı
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Performans metriklerini ve hata raporlarını Firebase'de izleyin.
                    </p>
                </CardContent>
                <CardFooter>
                     <Button asChild variant="outline">
                        <Link href="/admin/health">Sağlığı İzle</Link>
                    </Button>
                </CardFooter>
            </Card>
            <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Database className="w-6 h-6 text-primary"/>
                        Kullanım & Trafik
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Veritabanı, depolama ve hosting kullanımını ve maliyetlerini izleyin.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button asChild variant="outline">
                        <Link href="/admin/usage">Kullanımı Görüntüle</Link>
                    </Button>
                </CardFooter>
            </Card>
             <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <SlidersHorizontal className="w-6 h-6 text-primary"/>
                        Özellik Yönetimi
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        Quiz oyunu veya gönderi akışı gibi modülleri açıp kapatın.
                    </p>
                </CardContent>
                <CardFooter>
                     <Button asChild variant="outline">
                        <Link href="/admin/features">Özellikleri Yönet</Link>
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
                        Uygulama genelindeki oyun, zaman aşımı gibi ayarları yapın.
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
