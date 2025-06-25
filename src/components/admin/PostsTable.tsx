// src/components/admin/PostsTable.tsx
"use client";

import { useState } from "react";
import type { AdminPostData } from "@/app/admin/posts/page";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { deletePost } from "@/lib/actions/postActions"; // I can reuse this action
import { MoreHorizontal, Trash2, Loader2, Heart, MessageCircle, ImageIcon } from "lucide-react";

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

interface PostsTableProps {
  posts: AdminPostData[];
}

/**
 * Gönderileri listeleyen ve yönetme eylemlerini içeren tablo bileşeni.
 */
export default function PostsTable({ posts }: PostsTableProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<AdminPostData | null>(null);

    const handleDeletePost = async (post: AdminPostData) => {
        setIsProcessing(post.id);
        try {
            await deletePost(post.id, post.imageUrl);
            toast({ title: "Başarılı", description: "Gönderi başarıyla silindi." });
        } catch (error) {
            console.error("Gönderi silinirken hata:", error);
            toast({ title: "Hata", description: "Gönderi silinirken bir hata oluştu.", variant: "destructive" });
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
                        <TableHead>Gönderi</TableHead>
                        <TableHead>Yazar</TableHead>
                        <TableHead>Etkileşim</TableHead>
                        <TableHead>Tarih</TableHead>
                        <TableHead className="text-right">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {posts.map((post) => (
                        <TableRow key={post.id}>
                            <TableCell className="font-medium">
                               <div className="flex items-start gap-3">
                                 {post.imageUrl ? (
                                    <Image src={post.imageUrl} alt="Gönderi resmi" width={50} height={50} className="rounded-md object-cover aspect-square"/>
                                 ) : (
                                    <div className="flex h-[50px] w-[50px] items-center justify-center rounded-md bg-secondary">
                                        <ImageIcon className="h-6 w-6 text-muted-foreground"/>
                                    </div>
                                 )}
                                 <p className="line-clamp-3 max-w-sm">{post.text}</p>
                               </div>
                            </TableCell>
                            <TableCell>{post.username}</TableCell>
                             <TableCell>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-1 text-xs">
                                        <Heart className="h-3 w-3 text-red-500" /> {post.likeCount}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs">
                                        <MessageCircle className="h-3 w-3 text-blue-500" /> {post.commentCount}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {post.createdAt ? format(post.createdAt.toDate(), 'PP', { locale: tr }) : 'Bilinmiyor'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isProcessing === post.id}>
                                            {isProcessing === post.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(post)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Gönderiyi Sil
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
                            Bu gönderiyi kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeletePost(showDeleteConfirm!)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
