"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Trash2, Edit } from "lucide-react";
import { Timestamp, doc, deleteDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Room {
    id: string;
    name: string;
    topic: string;
    creatorName: string;
    createdBy: string;
    createdAt: Timestamp;
}

interface PostCardProps {
    room: Room;
}

export default function PostCard({ room }: PostCardProps) {
    const { toast } = useToast();
    const { user: currentUser } = useAuth();
    
    const timeAgo = room.createdAt
        ? formatDistanceToNow(room.createdAt.toDate(), { addSuffix: true, locale: tr })
        : "az önce";

    const creatorInitial = room.creatorName?.charAt(0).toUpperCase() || 'H';
    const isOwner = currentUser && currentUser.uid === room.createdBy;

    const handleDelete = async () => {
        if (!window.confirm(`'${room.name}' odasını silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`)) {
            return;
        }

        try {
            await deleteDoc(doc(db, "rooms", room.id));
            toast({
                title: "Oda Silindi",
                description: `'${room.name}' odası başarıyla silindi.`,
            });
        } catch (error) {
            console.error("Error deleting room: ", error);
            toast({
                title: "Hata",
                description: "Oda silinirken bir hata oluştu.",
                variant: "destructive",
            });
        }
    };
    
    const handleEdit = () => {
        toast({
            title: "Özellik Henüz Aktif Değil",
            description: "Oda düzenleme yakında gelecek!",
        });
    }

    return (
        <Card>
            <CardHeader className="flex-row items-center gap-4 space-y-0 p-4 pb-2">
                <Avatar>
                     <AvatarImage src={`https://i.pravatar.cc/150?u=${room.createdBy}`} />
                    <AvatarFallback>{creatorInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-semibold">{room.creatorName}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
                {isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                                <MoreHorizontal className="h-5 w-5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={handleEdit}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Düzenle</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Sil</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent className="p-4 pt-2">
                <Link href={`/rooms/${room.id}`} className="block rounded-lg -m-2 p-2 hover:bg-accent/20 transition-colors">
                  <h3 className="font-bold text-base mb-1">{room.name}</h3>
                  <p className="text-sm text-muted-foreground">{room.topic}</p>
                </Link>
            </CardContent>
        </Card>
    );
}
