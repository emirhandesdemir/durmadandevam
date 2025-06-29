// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { collection, onSnapshot, doc, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle, Headphones, BarChart3, SlidersHorizontal, Settings, Database, HeartPulse } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import type { VoiceStats } from "@/lib/types";

export default function DashboardPage() {
  const [userCount, setUserCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [voiceUserCount, setVoiceUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Use a callback to fetch non-realtime counts for efficiency
  const fetchCounts = useCallback(async () => {
    try {
      const [
        userSnapshot,
        roomSnapshot,
        postSnapshot,
        questionSnapshot,
      ] = await Promise.all([
        getCountFromServer(collection(db, "users")),
        getCountFromServer(collection(db, "rooms")),
        getCountFromServer(collection(db, "posts")),
        getCountFromServer(collection(db, "game_questions")),
      ]);

      setUserCount(userSnapshot.data().count);
      setRoomCount(roomSnapshot.data().count);
      setPostCount(postSnapshot.data().count);
      setQuestionCount(questionSnapshot.data().count);
      
    } catch (error) {
        console.error("Error fetching counts:", error);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchCounts();

    // Still use a listener for the live voice user count, as it's a single doc read
    const voiceStatsUnsub = onSnapshot(doc(db, "config", "voiceStats"), (doc) => {
      if (doc.exists()) {
        setVoiceUserCount((doc.data() as VoiceStats).totalUsers || 0);
      }
    });

    setIsLoading(false);

    return () => {
      voiceStatsUnsub();
    };
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
