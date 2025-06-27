// src/app/admin/dashboard/page.tsx
"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import StatCard from "@/components/admin/stat-card";
import { Users, MessageSquare, FileText, Puzzle, Headphones } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function DashboardPage() {
  const [userCount, setUserCount] = useState(0);
  const [roomCount, setRoomCount] = useState(0);
  const [postCount, setPostCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [voiceUserCount, setVoiceUserCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    let active = true;

    const unsubscribers = [
      onSnapshot(collection(db, "users"), (snapshot) => {
        if (active) setUserCount(snapshot.size);
      }),
      onSnapshot(collection(db, "rooms"), (snapshot) => {
        if (active) setRoomCount(snapshot.size);
      }),
      onSnapshot(collection(db, "posts"), (snapshot) => {
        if (active) setPostCount(snapshot.size);
      }),
      onSnapshot(collection(db, "game_questions"), (snapshot) => {
        if (active) setQuestionCount(snapshot.size);
      }),
      onSnapshot(doc(db, 'config', 'voiceStats'), (docSnap) => {
        if (active) setVoiceUserCount(docSnap.data()?.totalUsers || 0);
      })
    ];
    
    const timer = setTimeout(() => setIsLoading(false), 500);

    return () => {
      active = false;
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-8">
        <StatCard title="Toplam Kullanıcı" value={userCount} icon={Users} isLoading={isLoading} />
        <StatCard title="Aktif Odalar" value={roomCount} icon={MessageSquare} isLoading={isLoading} />
        <StatCard title="Toplam Gönderi" value={postCount} icon={FileText} isLoading={isLoading} />
        <StatCard title="Quiz Soruları" value={questionCount} icon={Puzzle} isLoading={isLoading} />
        <StatCard title="Sesteki Kullanıcı" value={voiceUserCount} icon={Headphones} isLoading={isLoading} />
      </div>

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
