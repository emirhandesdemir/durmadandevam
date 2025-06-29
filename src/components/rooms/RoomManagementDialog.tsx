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
import { deleteRoomAsOwner, extendRoomTime, updateRoomSettings } from "@/lib/actions/roomActions";
import { Trash2, Loader2, ShieldAlert, Clock, Hand } from "lucide-react";
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [requestToSpeak, setRequestToSpeak] = useState(room?.requestToSpeakEnabled || false);
  
  const handleToggleRequestToSpeak = async (enabled: boolean) => {
    if (!room) return;
    setIsSavingSettings(true);
    try {
        await updateRoomSettings(room.id, { requestToSpeakEnabled: enabled });
        setRequestToSpeak(enabled);
        toast({ description: "Oda ayarları güncellendi."})
    } catch (e: any) {
        toast({ variant: 'destructive', description: e.message });
    } finally {
        setIsSavingSettings(false);
    }
  }

  const handleDeleteRoom = async () => {
    if (!room || !user) return;
    setIsDeleting(true);
    try {
      await deleteRoomAsOwner(room.id, user.uid);
      toast({
        title: "Oda Silindi",
        description: `"${room.name}" adlı odanız başarıyla silindi.`,
      });
      setShowDeleteConfirm(false);
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
    }
  };

  const handleExtendTime = async () => {
      if (!room || !user) return;
      setIsExtending(true);
      try {
          await extendRoomTime(room.id, user.uid);
          toast({
              title: "Süre Uzatıldı!",
              description: "Odanızın süresi 10 dakika uzatıldı."
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

  if (!room) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>"{room.name}" Odasını Yönet</DialogTitle>
            <DialogDescription>
              Odanızla ilgili ayarları buradan yapabilirsiniz. Bu işlemler kalıcı olabilir.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
             <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                    <Label htmlFor="requests-mode" className="font-semibold flex items-center gap-2"><Hand className="h-4 w-4" /> El Kaldırma Modu</Label>
                    <p className="text-xs text-muted-foreground pl-6">Aktifse, katılımcıların konuşmak için izin istemesi gerekir.</p>
                </div>
                <Switch id="requests-mode" checked={requestToSpeak} onCheckedChange={handleToggleRequestToSpeak} disabled={isSavingSettings}/>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <h4 className="font-bold text-foreground">Süreyi Uzat</h4>
                <p className="text-sm text-muted-foreground">Odanın kapanma süresini 10 dakika ertele.</p>
                <p className="text-xs text-primary/80 mt-1 flex items-center gap-1">(Ücretsiz)</p>
              </div>
              <Button
                variant="secondary"
                onClick={handleExtendTime}
                disabled={isExtending}
              >
                {isExtending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Clock className="mr-2 h-4 w-4" />}
                Uzat
              </Button>
            </div>

            <div>
                 <h3 className="mb-2 text-lg font-semibold text-destructive">Tehlikeli Alan</h3>
                <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <div>
                    <h4 className="font-bold text-destructive">Odayı Kalıcı Olarak Sil</h4>
                    <p className="text-sm text-destructive/80">Bu işlem geri alınamaz. Odadaki tüm veriler silinecektir.</p>
                </div>
                <Button
                    variant="destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                >
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
            <AlertDialogAction
              onClick={handleDeleteRoom}
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Evet, Odayı Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
