// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, doc, getCountFromServer, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle, Headphones, BarChart3, SlidersHorizontal, Settings, HeartPulse, Mars, Venus } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import TopDiamondHoldersCard from "@/components/admin/TopDiamondHoldersCard";

/**
 * Yönetim Paneli - Dashboard Sayfası
 * 
 * Uygulamanın genel durumunu özetleyen ana panel sayfası.
 * Önemli istatistikleri (kullanıcı sayısı, oda sayısı vb.) ve
 * diğer yönetim sayfalarına hızlı erişim bağlantılarını içerir.
 */
export default function DashboardPage() {
  // İstatistikleri tutmak için state'ler.
  const [userCount, setUserCount] = useState(0);
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [voiceUserCount, setVoiceUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Performans için, sık değişmeyen verileri tek seferde çeken fonksiyon.
  const fetchCounts = useCallback(async () => {
    try {
      const usersRef = collection(db, "users");
      const roomsRef = collection(db, "rooms");
      const [
        userSnapshot,
        roomSnapshot,
        postSnapshot,
        maleSnapshot,
        femaleSnapshot,
        roomsDocsSnapshot
      ] = await Promise.all([
        // getCountFromServer, tüm koleksiyonu indirmeden sadece doküman sayısını vererek verimlilik sağlar.
        getCountFromServer(usersRef),
        getCountFromServer(roomsRef),
        getCountFromServer(collection(db, "posts")),
        getCountFromServer(query(usersRef, where("gender", "==", "male"))),
        getCountFromServer(query(usersRef, where("gender", "==", "female"))),
        getDocs(roomsRef) // Get all room docs to sum voice participants
      ]);

      setUserCount(userSnapshot.data().count);
      setRoomCount(roomSnapshot.data().count);
      setPostCount(postSnapshot.data().count);
      setMaleCount(maleSnapshot.data().count);
      setFemaleCount(femaleSnapshot.data().count);

      // Calculate total voice users by summing up counts from each room for accuracy
      let totalVoiceUsers = 0;
      roomsDocsSnapshot.forEach(doc => {
          totalVoiceUsers += doc.data().voiceParticipantsCount || 0;
      });
      setVoiceUserCount(totalVoiceUsers);
      
    } catch (error) {
        console.error("İstatistikler alınırken hata:", error);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCounts().finally(() => setIsLoading(false));
  }, [fetchCounts]);

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">
        Yönetim Paneli
      </h1>
      <p className="text-muted-foreground mt-1">
        Uygulamanın genel durumuna hoş geldiniz.
      </p>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
        <StatCard title="Toplam Kullanıcı" value={userCount} icon={Users} isLoading={isLoading} />
        <StatCard title="Erkek Kullanıcı" value={maleCount} icon={Mars} isLoading={isLoading} />
        <StatCard title="Kadın Kullanıcı" value={femaleCount} icon={Venus} isLoading={isLoading} />
        <StatCard title="Aktif Odalar" value={roomCount} icon={MessageSquare} isLoading={isLoading} />
        <StatCard title="Toplam Gönderi" value={postCount} icon={FileText} isLoading={isLoading} />
        <StatCard title="Sesli Aktif Kullanıcı" value={voiceUserCount} icon={Headphones} isLoading={isLoading} />
      </div>

       <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
            <h2 className="text-xl font-semibold tracking-tight text-foreground mb-4">Yönetim Araçları</h2>
            {/* Hızlı Erişim Kartları */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary"/>
                            Kullanıcı Yönetimi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Kullanıcıları görüntüleyin, rollerini veya elmaslarını yönetin.
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
                            Quiz Oyunu (AI)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                           Oyunlar artık AI tarafından otomatik yönetiliyor. Ayarlar için sistem sayfasına bakın.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/system">Sistem Ayarları</Link>
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
                            Sistem Durumu
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">
                            Servislerin canlı durumunu kontrol edin ve detaylı analizlere erişin.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button asChild variant="outline">
                            <Link href="/admin/status">Durumu Görüntüle</Link>
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
        <div className="md:col-span-1">
            {/* En çok elmasa sahip kullanıcıları gösteren kart. */}
             <TopDiamondHoldersCard />
        </div>
      </div>
    </div>
  );
}
