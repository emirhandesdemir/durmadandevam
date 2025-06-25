// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  // Veri sayımları ve yükleme durumu için state'ler
  const [userCount, setUserCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Firestore'dan verileri anlık olarak dinlemek için useEffect
  useEffect(() => {
    setIsLoading(true);

    // Kullanıcı sayısını dinle
    const userUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      setUserCount(snapshot.size);
    });

    // Oda sayısını dinle
    const roomUnsub = onSnapshot(collection(db, "rooms"), (snapshot) => {
      setRoomCount(snapshot.size);
    });

    // Gönderi sayısını dinle
    const postUnsub = onSnapshot(collection(db, "posts"), (snapshot) => {
      setPostCount(snapshot.size);
    });
    
    // Tüm dinleyiciler kurulduktan bir süre sonra yükleme durumunu false yap
    // Bu, tüm verilerin gelmesi için kısa bir zaman tanır.
    const timer = setTimeout(() => setIsLoading(false), 500);

    // Component unmount olduğunda dinleyicileri temizle
    return () => {
      userUnsub();
      roomUnsub();
      postUnsub();
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
        <StatCard title="Quiz Soruları" value="0" icon={Puzzle} isLoading={isLoading} />
      </div>

       {/* Hızlı Erişim Kartları */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold tracking-tight text-foreground">Yönetim Araçları</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
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
        </div>
      </div>
    </div>
  );
}
