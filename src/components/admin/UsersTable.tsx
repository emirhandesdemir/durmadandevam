// src/components/admin/UsersTable.tsx
"use client";

import { useState } from "react";
import type { UserProfile } from "@/lib/types";
import { formatDistanceToNow, format } from "date-fns";
import { tr } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";
import { updateUserRole, banUser, deleteUserAndContent } from "@/lib/actions/adminActions";
import { MoreHorizontal, Trash2, UserCheck, UserX, Loader2, ShieldCheck, Shield, Gem, Ban, Crown, CheckCircle2, CircleOff } from "lucide-react";

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
import ManagePremiumDialog from "./ManagePremiumDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import Link from 'next/link';

interface UsersTableProps {
  users: UserProfile[];
}

/**
 * Kullanıcıları listeleyen ve yönetme eylemlerini içeren tablo bileşeni.
 */
export default function UsersTable({ users }: UsersTableProps) {
    const { user: adminUser } = useAuth();
    const { toast } = useToast();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState<UserProfile | null>(null);
    const [showDiamondDialog, setShowDiamondDialog] = useState<UserProfile | null>(null);
    const [showPremiumDialog, setShowPremiumDialog] = useState<UserProfile | null>(null);

    const handleDeleteUser = async (user: UserProfile) => {
        if (!adminUser) return;
        setIsProcessing(user.uid);
        const result = await deleteUserAndContent(user.uid, adminUser.uid);
        if (result.success) {
            toast({ title: "Başarılı", description: `${user.username} adlı kullanıcının tüm verileri silindi.` });
        } else {
            toast({ title: "Hata", description: result.error, variant: "destructive" });
        }
        setShowDeleteConfirm(null);
        setIsProcessing(null);
    };
    
    const handleToggleAdmin = async (user: UserProfile) => {
        const newRole = user.role === 'admin' ? 'user' : 'admin';
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
    
    const handleToggleBan = async (user: UserProfile) => {
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
                <TableHead>E-posta</TableHead>
                <TableHead>Cinsiyet</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Elmas</TableHead>
                <TableHead>Son Görülme</TableHead>
                <TableHead className="text-right">Eylemler</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => {
                    const isPremium = user.premiumUntil && user.premiumUntil.toDate() > new Date();
                    return (
                        <TableRow key={user.uid} className={cn(user.reportCount && user.reportCount > 5 && "bg-destructive/10 hover:bg-destructive/20")}>
                            <TableCell>
                                <Link href={`/profile/${user.uid}`} className="flex items-center gap-3 group hover:underline" target="_blank">
                                    <Avatar>
                                        <AvatarImage src={user.photoURL || undefined} />
                                        <AvatarFallback>{user.username?.charAt(0).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium group-hover:text-primary">{user.username}</p>
                                        {user.reportCount && user.reportCount > 0 && (
                                            <span className="text-xs text-destructive font-bold">{user.reportCount} şikayet</span>
                                        )}
                                    </div>
                                </Link>
                            </TableCell>
                             <TableCell className="text-muted-foreground">{user.email}</TableCell>
                             <TableCell className="text-muted-foreground capitalize">{user.gender === 'male' ? 'Erkek' : user.gender === 'female' ? 'Kadın' : 'Belirtilmemiş'}</TableCell>
                             <TableCell>
                                {user.isOnline ? (
                                    <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700">
                                        <CheckCircle2 className="mr-1 h-3 w-3" />Çevrimiçi
                                    </Badge>
                                ) : (
                                    <Badge variant="secondary">
                                        <CircleOff className="mr-1 h-3 w-3" />Çevrimdışı
                                    </Badge>
                                )}
                                 {user.isBanned && <Badge variant="destructive" className="ml-2">Yasaklı</Badge>}
                            </TableCell>
                            <TableCell>
                                {isPremium ? (
                                    <Badge className="bg-amber-500 hover:bg-amber-600 border-amber-600 text-white">
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
                                <div className="flex items-center font-semibold">
                                    <Gem className="mr-2 h-4 w-4 text-cyan-400" />
                                    {user.diamonds || 0}
                                </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                                {user.lastSeen ? formatDistanceToNow(user.lastSeen.toDate(), { locale: tr, addSuffix: true }) : 'Bilinmiyor'}
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
                                        <DropdownMenuSeparator />
                                        <DropdownMenuLabel>Yönetimsel</DropdownMenuLabel>
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
                    "{showDeleteConfirm?.username}" adlı kullanıcıyı ve tüm verilerini (gönderiler, yorumlar, vs.) kalıcı olarak silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel disabled={!!isProcessing}>İptal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteUser(showDeleteConfirm!)} disabled={!!isProcessing} className="bg-destructive hover:bg-destructive/90">
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Evet, Sil
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
}
