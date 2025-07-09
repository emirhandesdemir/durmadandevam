// src/components/admin/LogsTable.tsx
"use client";

import type { AuditLog } from "@/lib/types";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import { UserPlus, UserX } from "lucide-react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

interface LogsTableProps {
  logs: AuditLog[];
}

/**
 * Gelen zaman damgası verisini güvenli bir şekilde Date nesnesine dönüştürür.
 * @param timestamp - Dönüştürülecek zaman damgası verisi.
 * @returns Geçerli bir Date nesnesi veya null.
 */
const parseTimestamp = (timestamp: any): Date | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Date) return timestamp;
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) return date;
    }
    if (typeof timestamp === 'object' && typeof timestamp.seconds === 'number') {
        return new Date(timestamp.seconds * 1000);
    }
    return null;
};


/**
 * Denetim kayıtlarını (audit logs) bir tablo içinde gösteren bileşen.
 */
export default function LogsTable({ logs }: LogsTableProps) {
    
    // Log türüne göre ikon ve renk belirleyen yardımcı fonksiyon.
    const getLogIconAndStyle = (type: AuditLog['type']) => {
        switch(type) {
            case 'user_created':
                return { Icon: UserPlus, color: 'text-green-600' };
            case 'user_deleted':
                return { Icon: UserX, color: 'text-destructive' };
            default:
                return { Icon: UserPlus, color: 'text-muted-foreground' };
        }
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead className="w-[100px]">Olay</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Aktör</TableHead>
                    <TableHead>Zaman</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {logs.map((log) => {
                    const { Icon, color } = getLogIconAndStyle(log.type);
                    const date = parseTimestamp(log.timestamp);
                    return (
                        <TableRow key={log.id}>
                            <TableCell>
                                <Badge variant={log.type === 'user_deleted' ? 'destructive' : 'secondary'}>
                                    <Icon className={cn("mr-2 h-4 w-4", color)} />
                                    {log.type === 'user_created' ? 'Kayıt' : 'Silme'}
                                </Badge>
                            </TableCell>
                            <TableCell className="font-medium">{log.details}</TableCell>
                            <TableCell>{log.actor.displayName || log.actor.email}</TableCell>
                            <TableCell>
                                {/* Tarihi okunabilir bir formata çevir. */}
                                {date ? format(date, 'PPpp', { locale: tr }) : 'Bilinmiyor'}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}
