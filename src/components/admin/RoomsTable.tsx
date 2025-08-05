// src/components/admin/RoomsTable.tsx
"use client";

import { useState } from "react";
import type { AdminRoomData } from "@/app/admin/rooms/page";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { deleteRoomWithSubcollections } from "@/lib/firestoreUtils";
import { MoreHorizontal, Trash2, Eye, Loader2, Users, Gift, Checkbox } from "lucide-react";

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
import { Badge } from "../ui/badge";

interface RoomsTableProps {
  rooms: AdminRoomData[];
}

export default function RoomsTable({ rooms }: RoomsTableProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [selectedRoomIds, setSelectedRoomIds] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<AdminRoomData | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

    const handleSelect = (roomId: string) => {
        setSelectedRoomIds(prev =>
            prev.includes(roomId) ? prev.filter(id => id !== roomId) : [...prev, roomId]
        );
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedRoomIds(rooms.map(r => r.id));
        } else {
            setSelectedRoomIds([]);
        }
    };
    
    const handleDeleteRoom = async (room: AdminRoomData) => {
        setIsProcessing(room.id);
        try {
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

    const handleBulkDelete = async () => {
        const roomsToDelete = [...selectedRoomIds];
        setIsProcessing('bulk');
        try {
            await Promise.all(roomsToDelete.map(id => deleteRoomWithSubcollections(id)));
            toast({ title: "Başarılı", description: `${roomsToDelete.length} oda başarıyla silindi.` });
            setSelectedRoomIds([]);
        } catch (error) {
            toast({ title: "Hata", description: "Odalar silinirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setShowBulkDeleteConfirm(false);
            setIsProcessing(null);
        }
    };


    const isAllSelected = selectedRoomIds.length > 0 && selectedRoomIds.length === rooms.length;

    return (
        <>
             {selectedRoomIds.length > 0 && (
                <div className="flex items-center gap-2 mb-4 p-2 rounded-md bg-muted border">
                    <p className="text-sm font-semibold">{selectedRoomIds.length} oda seçildi.</p>
                    <Button variant="destructive" size="sm" onClick={() => setShowBulkDeleteConfirm(true)}>
                        <Trash2 className="mr-2 h-4 w-4" /> Seçilenleri Sil
                    </Button>
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">
                            <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={handleSelectAll}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                        </TableHead>
                        <TableHead>Oda Adı</TableHead>
                        <TableHead>Oluşturan</TableHead>
                        <TableHead>Katılımcılar</TableHead>
                        <TableHead>Oluşturma Tarihi</TableHead>
                        <TableHead className="text-right">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rooms.map((room) => (
                        <TableRow key={room.id} data-state={selectedRoomIds.includes(room.id) ? "selected" : ""}>
                            <TableCell>
                                 <input
                                    type="checkbox"
                                    checked={selectedRoomIds.includes(room.id)}
                                    onChange={() => handleSelect(room.id)}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1">
                                    <p className="font-medium">{room.name}</p>
                                    {room.type === 'event' && <Badge variant="secondary" className="w-fit"><Gift className="mr-1 h-3 w-3"/> Etkinlik</Badge>}
                                </div>
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
            {/* Toplu Silme Onay Dialogu */}
             <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Seçili {selectedRoomIds.length} odayı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing === 'bulk'}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleBulkDelete} disabled={isProcessing === 'bulk'} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing === 'bulk' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Evet, Hepsini Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
