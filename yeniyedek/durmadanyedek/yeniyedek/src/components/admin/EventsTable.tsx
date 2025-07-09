// src/components/admin/EventsTable.tsx
"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Trash2, Eye, Loader2, Users, Gift } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteEventRoom } from "@/lib/actions/roomActions";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "../ui/badge";

interface EventsTableProps {
  rooms: Room[];
  onEdit: (room: Room) => void;
}

export default function EventsTable({ rooms, onEdit }: EventsTableProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<Room | null>(null);

    const handleDeleteRoom = async (room: Room) => {
        if (!user) return;
        setIsProcessing(room.id);
        try {
            await deleteEventRoom(room.id, user.uid);
            toast({ title: "Başarılı", description: `"${room.name}" etkinliği silindi.` });
        } catch (error) {
            console.error("Etkinlik odası silinirken hata:", error);
            toast({ title: "Hata", description: "Etkinlik odası silinirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setShowDeleteConfirm(null);
            setIsProcessing(null);
        }
    };

    return (
        <>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Etkinlik Adı</TableHead>
                        <TableHead>Oluşturan</TableHead>
                        <TableHead>Katılımcılar</TableHead>
                        <TableHead>Oluşturma Tarihi</TableHead>
                        <TableHead className="text-right">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rooms.map((room) => (
                        <TableRow key={room.id}>
                            <TableCell>
                                <p className="font-medium">{room.name}</p>
                                <Badge variant="secondary" className="mt-1"><Gift className="h-3 w-3 mr-1"/>Etkinlik</Badge>
                            </TableCell>
                            <TableCell>{room.createdBy.username}</TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <Users className="h-4 w-4" />
                                    {room.participants?.length || 0} / {room.maxParticipants}
                                </div>
                            </TableCell>
                            <TableCell>
                                {room.createdAt ? format(room.createdAt.toDate(), 'PPpp', { locale: tr }) : 'Bilinmiyor'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isProcessing === room.id}>
                                            {isProcessing === room.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/rooms/${room.id}`} target="_blank">
                                                <Eye className="mr-2 h-4 w-4" />
                                                Odayı Görüntüle
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(room)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Etkinliği Sil
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{showDeleteConfirm?.name}" etkinliğini kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteRoom(showDeleteConfirm!)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
