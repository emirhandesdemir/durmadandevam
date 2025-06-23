"use client";

import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MessageCircle, Repeat, Heart, Upload, MoreHorizontal, Star, Trash2, Edit } from "lucide-react";
import { Timestamp, doc, deleteDoc } from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Room {
    id: string;
    name: string;
    topic: string;
    creatorName: string;
    createdBy: string;
    createdAt: Timestamp;
}

interface PostCardProps {
    room: Room;
    currentUser: User | null;
}

export default function PostCard({ room, currentUser }: PostCardProps) {
    const { toast } = useToast();
    
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
        // TODO: Implement edit functionality
        toast({
            title: "Özellik Henüz Aktif Değil",
            description: "Oda düzenleme yakında gelecek!",
        });
    }

    return (
        <Card>
            <CardHeader className="flex-row items-start gap-4 space-y-0 p-4">
                <Avatar>
                    <AvatarFallback>{creatorInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <p className="font-semibold">{room.creatorName}</p>
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400"/>
                    </div>
                    <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>
                {isOwner && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
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
            <Link href={`/rooms/${room.id}`}>
              <CardContent className="p-4 pt-0">
                  <p>
                      <span className="font-bold">{room.name} ✨</span> Yeni, etkileyici sesli sohbet deneyimi, sesli sohbet odalarında oyun deneyimi 💎
                  </p>
              </CardContent>
            </Link>
            <CardFooter className="flex justify-between p-4 pt-0">
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <MessageCircle className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Repeat className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground">
                    <Heart className="mr-2 h-4 w-4"/> 0
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                    <Upload className="h-5 w-5"/>
                </Button>
            </CardFooter>
        </Card>
    );
}
