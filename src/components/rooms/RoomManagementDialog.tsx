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
import { deleteRoomWithSubcollections } from "@/lib/firestoreUtils";
import { Trash2, Loader2, ShieldAlert } from "lucide-react";
import type { Room } from "@/lib/types";

interface RoomManagementDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  room: Room | null;
}

export default function RoomManagementDialog({ isOpen, setIsOpen, room }: RoomManagementDialogProps) {
  const { toast } = useToast();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteRoom = async () => {
    if (!room) return;
    setIsDeleting(true);
    try {
      await deleteRoomWithSubcollections(room.id);
      toast({
        title: "Oda Silindi",
        description: `"${room.name}" adlı odanız başarıyla silindi.`,
      });
      setShowDeleteConfirm(false);
      setIsOpen(false);
    } catch (error) {
      console.error("Oda silinirken hata:", error);
      toast({
        title: "Hata",
        description: "Oda silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

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

          <div className="py-4">
            <h3 className="mb-4 text-lg font-semibold">Tehlikeli Alan</h3>
            <div className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 p-4">
              <div>
                <h4 className="font-bold text-destructive">Odayı Kalıcı Olarak Sil</h4>
                <p className="text-sm text-destructive/80">Bu işlem geri alınamaz. Odadaki tüm mesajlar ve veriler silinecektir.</p>
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
