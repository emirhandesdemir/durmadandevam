// src/components/admin/BotUsersTable.tsx
'use client';

import { useState } from 'react';
import type { UserProfile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { deleteUserFromFirestore } from '@/lib/actions/adminActions';
import { MoreHorizontal, Trash2, Loader2, Bot } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';

interface BotUsersTableProps {
  bots: UserProfile[];
  loading: boolean;
  onBotDeleted: () => void;
}

export default function BotUsersTable({ bots, loading, onBotDeleted }: BotUsersTableProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserProfile | null>(null);

  const handleDeleteBot = async (bot: UserProfile) => {
    setIsProcessing(bot.uid);
    try {
      const result = await deleteUserFromFirestore(bot.uid);
      if (result.success) {
        toast({ title: 'Başarılı', description: 'Bot başarıyla silindi.' });
        onBotDeleted(); // Callback to refresh the list on the parent page
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({ title: 'Hata', description: error.message || 'Bot silinirken bir hata oluştu.', variant: 'destructive' });
    } finally {
      setShowDeleteConfirm(null);
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (bots.length === 0) {
    return <p className="text-sm text-center text-muted-foreground p-4">Henüz hiç bot oluşturulmamış.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Kullanıcı</TableHead>
            <TableHead>Cinsiyet</TableHead>
            <TableHead className="text-right">Eylemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {bots.map((bot) => (
            <TableRow key={bot.uid}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={bot.photoURL || undefined} />
                    <AvatarFallback>{bot.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <p className="font-medium">{bot.username}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{bot.gender === 'female' ? 'Kadın' : 'Erkek'}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isProcessing === bot.uid}>
                      {isProcessing === bot.uid ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowDeleteConfirm(bot)} className="text-destructive focus:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Botu Sil</span>
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
              "{showDeleteConfirm?.username}" adlı botu kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDeleteBot(showDeleteConfirm!)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
