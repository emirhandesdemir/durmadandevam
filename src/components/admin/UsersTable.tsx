// src/components/admin/UsersTable.tsx
"use client";

import { useState } from "react";
import type { UserData } from "@/app/admin/users/page";
import { format } from "date-fns";
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { deleteUserFromFirestore, updateUserRole, banUser } from "@/lib/actions/adminActions";
import { MoreHorizontal, Trash2, UserCheck, UserX, Loader2, ShieldCheck, Shield, Gem, Ban, Swords, Crown } from "lucide-react";

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
  DropdownMenuLabel,
  DropdownMenuSeparator,
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

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ManageDiamondsDialog from "./ManageDiamondsDialog";
import ManagePremiumDialog from "./ManagePremiumDialog"; // Import the new dialog
import { cn } from "@/lib/utils";

interface UsersTableProps {
  users: UserData[];
}

/**
 * Kullanıcıları listeleyen ve yönetme eylemlerini içeren tablo bileşeni.
 */
export default function UsersTable({ users }: UsersTableProps) {
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null); // Hangi kullanıcının işlendiğini tutar
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserData | null>(null);
    const [showDiamondDialog, setShowDiamondDialog] = useState<UserData | null>(null);
    const [showPremiumDialog, setShowPremiumDialog] = useState<UserData | null>(null); // State for the premium dialog

    const handleDeleteUser = async (user: UserData) => {
        setIsProcessing(user.uid);
        const result = await deleteUserFromFirestore(user.uid);
        if (result.success) {
            toast({ title: "Başarılı", description: `${user.username} adlı kullanıcının Firestore kaydı silindi.` });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setShowDeleteConfirm(null);
        setIsProcessing(null);
    };
    
    const handleToggleAdmin = async (user: UserData) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
        // Son adminin yetkisinin alınmasını engelle
        if(user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1) {
            toast({ title: "İşlem Engellendi", description: "Sistemdeki son yöneticinin yetkisini kaldıramazsınız.", variant: "destructive" });
            return;
        }

        setIsProcessing(user.uid);
        const result = await updateUserRole(user.uid, newRole);
        if (result.success) {
            toast({ title: "Başarılı", description: `${user.username} adlı kullanıcının rolü ${newRole} olarak güncellendi.` });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsProcessing(null);
    }
    
    const handleToggleBan = async (user: UserData) => {
        const newBanState = !user.isBanned;
        setIsProcessing(user.uid);
        const result = await banUser(user.uid, newBanState);
        if(result.success) {
            toast({ title: "Başarılı", description: `${user.username} adlı kullanıcı ${newBanState ? 'yasaklandı' : 'yasağı kaldırıldı'}.` });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setIsProcessing(null);
    }

  return (
      <>
        <Table>
            <TableHeader>
                <TableRow>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Elmas</TableHead>
                <TableHead>Katılma Tarihi</TableHead>
                <TableHead className="text-right">Eylemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => {
                    const isPremium = user.premiumUntil && user.premiumUntil.toDate() > new Date();
                    return (
                        <TableRow key={user.uid} className={cn(user.reportCount && user.reportCount > 2 && "bg-destructive/10 hover:bg-destructive/20")}>
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={user.photoURL || undefined} />
                                        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium">{user.username}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                {isPremium ? (
                                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-700">
                                        <Crown className="mr-1 h-3 w-3" />
                                        Premium
                                    </Badge>
                                ) : (
                                    <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                        {user.role === 'admin' ? <ShieldCheck className="mr-1 h-3 w-3" /> : <Shield className="mr-1 h-3 w-3" />}
                                        {user.role}
                                    </Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                <Badge variant={user.isBanned ? 'destructive' : 'secondary'}>
                                    {user.isBanned ? 'Yasaklı' : 'Aktif'}
                                </Badge>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center font-semibold">
                                    <Gem className="mr-2 h-4 w-4 text-cyan-400" />
                                    {user.diamonds || 0}
                                </div>
                            </TableCell>
                            <TableCell>
                                {user.createdAt ? format(user.createdAt.toDate(), 'PPpp', { locale: tr }) : 'Bilinmiyor'}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" disabled={isProcessing === user.uid}>
                                            {isProcessing === user.uid ? <Loader2 className="h-4 w-4 animate-spin"/> : <MoreHorizontal className="h-4 w-4" />}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Eylemler</DropdownMenuLabel>
                                         <DropdownMenuItem onClick={() => setShowPremiumDialog(user)}>
                                            <Crown className="mr-2 h-4 w-4" />
                                            <span>Premium'u Yönet</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => setShowDiamondDialog(user)}>
                                            <Gem className="mr-2 h-4 w-4" />
                                            <span>Elmasları Yönet</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleAdmin(user)}>
                                            {user.role === 'admin' ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                                            <span>{user.role === 'admin' ? 'Admin Yetkisini Al' : 'Admin Yap'}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleToggleBan(user)}>
                                            <Ban className="mr-2 h-4 w-4" />
                                            <span>{user.isBanned ? 'Yasağı Kaldır' : 'Kullanıcıyı Yasakla'}</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => setShowDeleteConfirm(user)} className="text-destructive focus:text-destructive">
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            <span>Kullanıcıyı Sil</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>

        <ManageDiamondsDialog
            isOpen={!!showDiamondDialog}
            setIsOpen={() => setShowDiamondDialog(null)}
            user={showDiamondDialog}
        />
        
        <ManagePremiumDialog
            isOpen={!!showPremiumDialog}
            setIsOpen={() => setShowPremiumDialog(null)}
            user={showPremiumDialog}
        />

        {/* Silme Onay Dialogu */}
        <AlertDialog open={!!showDeleteConfirm} onOpenChange={(open) => !open && setShowDeleteConfirm(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                <AlertDialogDescription>
                    {showDeleteConfirm?.username} adlı kullanıcıyı kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem, kullanıcının sadece veritabanı kaydını siler, kimlik doğrulama hesabını silmez ve geri alınamaz.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteUser(showDeleteConfirm!)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sil
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
}
