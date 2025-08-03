
// src/components/admin/AnalyticsCharts.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, Bar, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTheme } from "next-themes";
import { getUserGrowthData, getContentCreationData, getRoomActivityData, getContentCreationByGenderData } from "@/lib/actions/analyticsActions";
import type { UserGrowthDataPoint, ContentDataPoint, RoomActivityDataPoint } from "@/lib/types";
import { Loader2 } from "lucide-react";

/**
 * Yönetim panelindeki istatistik grafikleri bileşeni.
 * Kullanıcı büyümesi, içerik üretimi ve oda aktivitesi gibi
 * verileri `recharts` kütüphanesi kullanarak görselleştirir.
 */
export default function AnalyticsCharts() {
    const { resolvedTheme } = useTheme(); // Mevcut temayı al (aydınlık/karanlık)
    
    // Grafikler için veri state'leri
    const [userGrowth, setUserGrowth] = useState<UserGrowthDataPoint[]>([]);
    const [contentCreation, setContentCreation] = useState<ContentDataPoint[]>([]);
    const [roomActivity, setRoomActivity] = useState<RoomActivityDataPoint[]>([]);
    const [contentByGender, setContentByGender] = useState<{name: string, gönderi: number}[]>([]);

    // Yükleme durumları için state'ler
    const [loadingGrowth, setLoadingGrowth] = useState(true);
    const [loadingContent, setLoadingContent] = useState(true);
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingGender, setLoadingGender] = useState(true);

    // Bileşen yüklendiğinde sunucu eylemlerini çağırarak verileri çek.
    useEffect(() => {
        getUserGrowthData().then(data => {
            setUserGrowth(data);
            setLoadingGrowth(false);
        });
        getContentCreationData().then(data => {
            setContentCreation(data);
            setLoadingContent(false);
        });
        getRoomActivityData().then(data => {
            setRoomActivity(data);
            setLoadingRooms(false);
        });
        getContentCreationByGenderData().then(data => {
            setContentByGender(data);
            setLoadingGender(false);
        });
    }, []);

    // Grafiklerin tema ile uyumlu görünmesi için renk ayarları.
    const tickColor = resolvedTheme === 'dark' ? '#888' : '#aaa';
    const strokeColor = resolvedTheme === 'dark' ? '#555' : '#ddd';

    // Yükleniyor durumunda gösterilecek bileşen.
    const renderLoading = () => (
        <div className="flex items-center justify-center h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary"/>
        </div>
    );
    
    // Veri olmadığında gösterilecek bileşen.
    const renderNoData = (message: string) => (
         <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">{message}</p>
        </div>
    )

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kullanıcı Büyümesi Grafiği */}
            <Card>
                <CardHeader>
                    <CardTitle>Kullanıcı Büyümesi</CardTitle>
                    <CardDescription>Son 6 aydaki yeni kullanıcı kayıtları.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingGrowth ? renderLoading() : userGrowth.length === 0 ? renderNoData("Kullanıcı verisi bulunamadı.") : (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={userGrowth}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} />
                                <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Area type="monotone" dataKey="users" name="Yeni Kullanıcı" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsers)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

             {/* İçerik Üretimi Grafiği (Haftalık) */}
             <Card>
                <CardHeader>
                    <CardTitle>İçerik Üretimi (Haftalık)</CardTitle>
                    <CardDescription>Son 7 gündeki gönderi ve yorum sayıları.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingContent ? renderLoading() : contentCreation.length === 0 ? renderNoData("İçerik verisi bulunamadı.") : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={contentCreation}>
                                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor}/>
                                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }}/>
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} allowDecimals={false}/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="posts" fill="hsl(var(--primary))" name="Gönderiler" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="comments" fill="hsl(var(--accent))" name="Yorumlar" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

             {/* İçerik Üretimi Grafiği (Cinsiyete Göre) */}
             <Card>
                <CardHeader>
                    <CardTitle>İçerik Üretimi (Cinsiyete Göre)</CardTitle>
                    <CardDescription>Toplam gönderilerin cinsiyete göre dağılımı.</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingGender ? renderLoading() : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={contentByGender} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} />
                                <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Bar dataKey="gönderi" fill="hsl(var(--primary))" name="Gönderi Sayısı" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </CardContent>
            </Card>

             {/* Oda Aktivitesi Grafiği (24 Saat) */}
             <Card>
                <CardHeader>
                    <CardTitle>Oda Aktivitesi (24 Saat)</CardTitle>
                    <CardDescription>Son 24 saat içinde oluşturulan odaların saatlik dağılımı.</CardDescription>
                </CardHeader>
                <CardContent>
                     {loadingRooms ? renderLoading() : roomActivity.length === 0 ? renderNoData("Oda aktivite verisi bulunamadı.") : (
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={roomActivity}>
                                <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} />
                                <XAxis dataKey="hour" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                                <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} allowDecimals={false}/>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        borderRadius: 'var(--radius)'
                                    }}
                                />
                                <Line type="monotone" dataKey="rooms" name="Oluşturulan Odalar" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            </LineChart>
                        </ResponsiveContainer>
                     )}
                </CardContent>
            </Card>
        </div>
    )
}
