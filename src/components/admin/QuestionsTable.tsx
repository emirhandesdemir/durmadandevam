// src/components/admin/QuestionsTable.tsx
"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { deleteQuestion } from "@/lib/actions/gameActions";
import type { GameQuestion } from "@/lib/types";

import { MoreHorizontal, Trash2, Edit, Loader2 } from "lucide-react";
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

interface QuestionsTableProps {
  questions: GameQuestion[];
  onEdit: (question: GameQuestion) => void;
}

/**
 * Quiz sorularını listeleyen ve yönetme (düzenleme, silme) eylemlerini içeren tablo bileşeni.
 */
export default function QuestionsTable({ questions, onEdit }: QuestionsTableProps) {
    const { toast } = useToast();
    // Hangi sorunun işlendiğini tutar (örn: silinirken yükleme animasyonu göstermek için).
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    // Silme onayı dialogunu göstermek için seçilen soruyu tutar.
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<GameQuestion | null>(null);

    // Soruyu silme fonksiyonu.
    const handleDelete = async (questionId: string) => {
        setIsProcessing(questionId);
        try {
            await deleteQuestion(questionId);
            toast({ title: "Başarılı", description: "Soru başarıyla silindi." });
        } catch (error) {
            console.error("Soru silinirken hata:", error);
            toast({ title: "Hata", description: "Soru silinirken bir hata oluştu.", variant: "destructive" });
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
                        <TableHead>Soru</TableHead>
                        <TableHead>Doğru Cevap</TableHead>
                        <TableHead>Eklenme Tarihi</TableHead>
                        <TableHead className="text-right">Eylemler</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {questions.map((q) => (
                        <TableRow key={q.id}>
                            <TableCell className="font-medium max-w-md">
                                <p className="truncate">{q.question}</p>
                            </TableCell>
                            <TableCell>
                                <Badge variant="secondary">{q.options[q.correctOptionIndex]}</Badge>
                            </TableCell>
                            <TableCell>
                                {q.createdAt ? format(q.createdAt.toDate(), 'PPp', { locale: tr }) : 'Bilinmiyor'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isProcessing === q.id}>
                                            {isProcessing === q.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => onEdit(q)}>
                                            <Edit className="mr-2 h-4 w-4" />
                                            Düzenle
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(q)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Sil
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
                            Bu soruyu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(showDeleteConfirm!.id)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
