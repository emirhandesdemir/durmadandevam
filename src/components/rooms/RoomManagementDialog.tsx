// src/components/rooms/RoomManagementDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { deleteRoomAsOwner, extendRoomTime, increaseParticipantLimit, extendRoomFor30Days, updateRoomSettings } from "@/lib/actions/roomActions";
import { Trash2, Loader2, ShieldAlert, Clock, UserPlus, Gem, CalendarDays, Gamepad2, Puzzle } from "lucide-react";
import type { Room } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";

interface RoomManagementDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  room: Room | null;
}

export default function RoomManagementDialog({ isOpen, setIsOpen, room }: RoomManagementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isIncreasingLimit, setIsIncreasingLimit] = useState(false);
  const [isExtending30Days, setIsExtending30Days] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  
  const [autoQuizEnabled, setAutoQuizEnabled] = useState(room?.autoQuizEnabled ?? true);


  if (!room) return null;
  const isHost = user?.uid === room.createdBy.uid;

  const handleDeleteRoom = async () => {
    if (!room || !user) return;
    setIsDeleting(true);
    try {
      await deleteRoomAsOwner(room.id, user.uid);
      toast({
        title: "Oda Silindi",
        description: `"${room.name}" adlı odanız başarıyla silindi.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      console.error("Oda silinirken hata:", error);
      toast({
        title: "Hata",
        description: error.message || "Oda silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleExtendTime = async () => {
      if (!room || !user) return;
      setIsExtending(true);
      try {
          await extendRoomTime(room.id, user.uid);
          toast({
              title: "Süre Uzatıldı!",
              description: "Odanızın süresi 20 dakika uzatıldı."
          });
      } catch (error: any) {
          toast({
              title: "Hata",
              description: error.message || "Süre uzatılırken bir hata oluştu.",
              variant: "destructive",
          });
      } finally {
          setIsExtending(false);
      }
  }

  const handleIncreaseLimit = async () => {
    if (!room || !user) return;
    setIsIncreasingLimit(true);
    try {
        await increaseParticipantLimit(room.id, user.uid);
        toast({
            title: "Limit Artırıldı!",
            description: "Katılımcı limiti 1 artırıldı."
        });
    } catch (error: any) {
        toast({
            title: "Hata",
            description: error.message || "Limit artırılırken bir hata oluştu.",
            variant: "destructive",
        });
    } finally {
        setIsIncreasingLimit(false);
    }
  }

  const handleExtendFor30Days = async () => {
    if (!room || !user) return;
    setIsExtending30Days(true);
    try {
        await extendRoomFor30Days(room.id, user.uid);
        toast({
            title: "Oda Uzatıldı!",
            description: "Odanızın süresi 30 gün olarak ayarlandı."
        });
        setIsOpen(false);
    } catch (error: any) {
        toast({
            title: "Hata",
            description: error.message || "Oda süresi uzatılırken bir hata oluştu.",
            variant: "destructive",
        });
    } finally {
        setIsExtending30Days(false);
    }
  }
  
  const handleSettingsSave = async () => {
      if (!room || !user || !isHost) return;
      setIsSavingSettings(true);
      try {
          await updateRoomSettings(room.id, { autoQuizEnabled });
          toast({ description: "Oda ayarları kaydedildi."})
      } catch (error: any) {
           toast({ variant: 'destructive', description: "Ayarlar kaydedilirken hata." });
      } finally {
          setIsSavingSettings(false);
      }
  }


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>"{room.name}" Odasını Yönet</DialogTitle>
            <DialogDescription>
              Odanızla ilgili ayarları buradan yapabilirsiniz. Bu işlemler elmas gerektirebilir.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                    <Label htmlFor="auto-quiz" className="font-semibold flex items-center gap-2">
                        <Puzzle className="h-4 w-4 text-muted-foreground"/>
                        Otomatik Quizi Etkinleştir
                    </Label>
                    <Switch
                        id="auto-quiz"
                        checked={autoQuizEnabled}
                        onCheckedChange={setAutoQuizEnabled}
                    />
                </div>
                 <Button size="sm" onClick={handleSettingsSave} disabled={isSavingSettings} className="w-full">
                    {isSavingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Oyun Ayarını Kaydet
                </Button>
            </div>

             <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <h4 className="font-bold text-foreground">Süreyi Uzat (+20 dk)</h4>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">Maliyet: <strong className="flex items-center gap-1">15 <Gem className="h-3 w-3 text-cyan-400" /></strong></p>
              </div>
              <Button variant="secondary" onClick={handleExtendTime} disabled={isExtending}>
                {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Uzat
              </Button>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <h4 className="font-bold text-foreground">Katılımcı Artır (+1)</h4>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">Maliyet: <strong className="flex items-center gap-1">5 <Gem className="h-3 w-3 text-cyan-400" /></strong></p>
              </div>
              <Button variant="secondary" onClick={handleIncreaseLimit} disabled={isIncreasingLimit}>
                {isIncreasingLimit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                Artır
              </Button>
            </div>
            
             <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <h4 className="font-bold text-foreground">Odayı 30 Gün Açık Tut</h4>
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">Maliyet: <strong className="flex items-center gap-1">500 <Gem className="h-3 w-3 text-cyan-400" /></strong></p>
              </div>
              <Button variant="secondary" onClick={handleExtendFor30Days} disabled={isExtending30Days}>
                {isExtending30Days ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarDays className="mr-2 h-4 w-4" />}
                Satın Al
              </Button>
            </div>

            <div>
                 <h3 className="mb-2 text-lg font-semibold text-destructive">Tehlikeli Alan</h3>
                <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div>
                    <h4 className="font-bold text-destructive">Odayı Kalıcı Olarak Sil</h4>
                    <p className="text-sm text-destructive/80">Bu işlem geri alınamaz. Odadaki tüm veriler silinecektir.</p>
                </div>
                <Button variant="destructive" onClick={() => { setIsOpen(false); setTimeout(() => setShowDeleteConfirm(true), 150); }}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Sil
                </Button>
                </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Silme Onay Dialogu */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>Emin misiniz?</AlertDialogTitle>
            <AlertDialogDescription>
                "{room.name}" odasını kalıcı olarak silmek üzeresiniz. Bu işlemle birlikte odadaki tüm mesajlar ve veriler de kalıcı olarak silinecektir. 
                <br/><br/>
                <strong>Bu işlem geri alınamaz.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteRoom} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evet, Odayı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
