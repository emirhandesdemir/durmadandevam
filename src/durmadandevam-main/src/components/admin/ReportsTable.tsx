// src/components/admin/ReportsTable.tsx
"use client";

import type { Report } from "@/lib/types";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { ArrowRight } from "lucide-react";

interface ReportsTableProps {
  reports: Report[];
}

const reasonLabels: { [key: string]: string } = {
  spam: 'Spam veya yanıltıcı',
  harassment: 'Taciz veya zorbalık',
  hate_speech: 'Nefret söylemi',
  inappropriate_content: 'Uygunsuz içerik',
  impersonation: 'Taklitçilik',
  other: 'Diğer',
};

export default function ReportsTable({ reports }: ReportsTableProps) {
    if (reports.length === 0) {
        return <p className="text-center text-muted-foreground py-8">Henüz hiç şikayet yok.</p>;
    }
    
    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Raporlayan</TableHead>
                    <TableHead>Raporlanan</TableHead>
                    <TableHead>Sebep</TableHead>
                    <TableHead>Detay</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead className="text-right">Hedef</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {reports.map((report) => (
                    <TableRow key={report.id}>
                        <TableCell>
                            <Link href={`/profile/${report.reporterId}`} className="hover:underline font-medium" target="_blank">
                                {report.reporterUsername}
                            </Link>
                        </TableCell>
                         <TableCell>
                            <Link href={`/profile/${report.reportedUserId}`} className="hover:underline font-medium text-destructive" target="_blank">
                                {report.reportedUsername}
                            </Link>
                        </TableCell>
                        <TableCell>
                            <Badge variant="secondary">{reasonLabels[report.reason] || report.reason}</Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                           {report.details || '-'}
                        </TableCell>
                        <TableCell>
                            {report.timestamp ? format(report.timestamp.toDate(), 'PPp', { locale: tr }) : 'Bilinmiyor'}
                        </TableCell>
                        <TableCell className="text-right">
                           <Button asChild variant="outline" size="sm">
                                <Link href={report.targetType === 'post' ? `/home` : `/profile/${report.reportedUserId}`} target="_blank">
                                    {report.targetType === 'post' ? 'Gönderiye Git' : 'Profile Git'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                           </Button>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
