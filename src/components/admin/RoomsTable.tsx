// src/components/admin/RoomsTable.tsx
"use client";

import { useState } from "react";
import type { AdminRoomData } from "@/app/admin/rooms/page";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { deleteRoomWithSubcollections } from "@/lib/firestoreUtils";
import { MoreHorizontal, Trash2, Eye, Loader2, Users } from "lucide-react";

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

interface RoomsTableProps {
  rooms: AdminRoomData[];
}

/**
 * Odaları listeleyen ve yönetme (görüntüleme, silme) eylemlerini içeren tablo bileşeni.
 */
export default function RoomsTable({ rooms }: RoomsTableProps) {
    const { toast } = useToast();
    // Hangi odanın işlendiğini tutar (örn: silinirken yükleme animasyonu göstermek için).
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    // Silme onayı dialogunu göstermek için seçilen odayı tutar.
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<AdminRoomData | null>(null);

    // Odayı silme fonksiyonu.
    const handleDeleteRoom = async (room: AdminRoomData) => {
        setIsProcessing(room.id);
        try {
            // Bu yardımcı fonksiyon, oda dokümanını ve tüm alt koleksiyonlarını (mesajlar vb.) siler.
            await deleteRoomWithSubcollections(room.id);
            toast({ title: "Başarılı", description: `"${room.name}" odası ve tüm içeriği silindi.` });
        } catch (error) {
            console.error("Oda silinirken hata:", error);
            toast({ title: "Hata", description: "Oda silinirken bir hata oluştu.", variant: "destructive" });
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
                        <TableHead>Oda Adı</TableHead>
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
                                <p className="text-sm text-muted-foreground truncate max-w-xs">{room.description}</p>
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
                                            Odayı Sil
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
            {/* Silme Onay Dialogu */}
             <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{showDeleteConfirm?.name}" odasını kalıcı olarak silmek istediğinizden emin misiniz? Bu işlemle birlikte odadaki tüm mesajlar da silinecektir ve bu işlem geri alınamaz.
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
