// src/components/admin/AnalyticsCharts.tsx
"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AreaChart, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Area, Bar, ResponsiveContainer, LineChart, Line } from 'recharts';
import { useTheme } from "next-themes";

// Mock data for the charts
const userGrowthData = [
  { month: 'Ocak', users: 120 },
  { month: 'Şubat', users: 210 },
  { month: 'Mart', users: 350 },
  { month: 'Nisan', users: 510 },
  { month: 'Mayıs', users: 680 },
  { month: 'Haziran', users: 890 },
];

const contentCreationData = [
  { name: 'Pzt', posts: 22, comments: 34 },
  { name: 'Sal', posts: 35, comments: 55 },
  { name: 'Çar', posts: 41, comments: 62 },
  { name: 'Per', posts: 30, comments: 45 },
  { name: 'Cum', posts: 55, comments: 78 },
  { name: 'Cmt', posts: 72, comments: 95 },
  { name: 'Paz', posts: 61, comments: 82 },
];

const roomActivityData = [
    { hour: '00:00', rooms: 5 },
    { hour: '03:00', rooms: 3 },
    { hour: '06:00', rooms: 8 },
    { hour: '09:00', rooms: 15 },
    { hour: '12:00', rooms: 22 },
    { hour: '15:00', rooms: 28 },
    { hour: '18:00', rooms: 45 },
    { hour: '21:00', rooms: 52 },
];


export default function AnalyticsCharts() {
    const { resolvedTheme } = useTheme();
    const tickColor = resolvedTheme === 'dark' ? '#888' : '#aaa';
    const strokeColor = resolvedTheme === 'dark' ? '#555' : '#ddd';

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Kullanıcı Büyümesi</CardTitle>
                    <CardDescription>Son 6 aydaki yeni kullanıcı kayıtları.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={userGrowthData}>
                            <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} />
                            <XAxis dataKey="month" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                            />
                            <Area type="monotone" dataKey="users" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorUsers)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>İçerik Oluşturma</CardTitle>
                    <CardDescription>Haftalık gönderi ve yorum sayıları.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={contentCreationData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={strokeColor}/>
                            <XAxis dataKey="name" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }}/>
                            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }}/>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                            />
                            <Legend />
                            <Bar dataKey="posts" fill="hsl(var(--primary))" name="Gönderiler" />
                            <Bar dataKey="comments" fill="hsl(var(--secondary))" name="Yorumlar" />
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

             <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Oda Aktivitesi</CardTitle>
                    <CardDescription>Gün içindeki aktif oda sayısının saatlik dağılımı.</CardDescription>
                </CardHeader>
                <CardContent>
                     <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={roomActivityData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={strokeColor} />
                            <XAxis dataKey="hour" tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                            <YAxis tick={{ fill: tickColor, fontSize: 12 }} tickLine={{ stroke: tickColor }} />
                             <Tooltip
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                            />
                            <Line type="monotone" dataKey="rooms" name="Aktif Odalar" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    )
}
