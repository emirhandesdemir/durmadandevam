// src/components/admin/EventsTable.tsx
"use client";

import { useState } from "react";
import type { Room } from "@/lib/types";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { MoreHorizontal, Trash2, Eye, Loader2, Users, Gift, KeyRound } from "lucide-react";
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
import { Input } from '@/components/ui/input';
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
    const [roomToDelete, setRoomToDelete] = useState<Room | null>(null);
    const [pin, setPin] = useState("");

    const handleDeleteRoom = async () => {
        if (!user || !roomToDelete || !pin) return;
        setIsProcessing(roomToDelete.id);
        try {
            await deleteEventRoom(roomToDelete.id, user.uid, pin);
            toast({ title: "Başarılı", description: `"${roomToDelete.name}" etkinliği silindi.` });
        } catch (error) {
            console.error("Etkinlik odası silinirken hata:", error);
            toast({ title: "Hata", description: "Etkinlik odası silinirken bir hata oluştu.", variant: "destructive" });
        } finally {
            setRoomToDelete(null);
            setIsProcessing(null);
            setPin("");
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
                                        <DropdownMenuItem onClick={() => setRoomToDelete(room)} className="text-destructive focus:text-destructive">
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
            <AlertDialog open={!!roomToDelete} onOpenChange={(open) => !open && setRoomToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                        <AlertDialogDescription>
                            "{roomToDelete?.name}" etkinliğini kalıcı olarak silmek istediğinizden emin misiniz? Katılımcılara ödülleri dağıtılacak ve bu işlem geri alınamayacaktır. Lütfen yönetici PIN'ini girin.
                        </AlertDialogDescription>
                         <div className="relative pt-2">
                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                            <Input
                                type="password"
                                placeholder="Yönetici PIN'i"
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteRoom} disabled={!!isProcessing || !pin} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
