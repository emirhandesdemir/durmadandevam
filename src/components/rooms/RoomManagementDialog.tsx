// src/components/rooms/RoomManagementDialog.tsx
"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { deleteRoomAsOwner, extendRoomTime, increaseParticipantLimit, updateRoomDetails } from "@/lib/actions/roomActions";
import { Trash2, Loader2, ShieldAlert, Clock, UserPlus, Gem, Settings } from "lucide-react";
import type { Room } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "../ui/textarea";
import { Label } from "../ui/label";
import { Input } from "../ui/input";

interface RoomManagementDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  room: Room | null;
}

const ActionCard = ({ title, description, cost, icon: Icon, action, isLoading, children, variant = 'secondary' }: { title: string, description: string, cost?: number, icon: React.ElementType, action: () => void, isLoading: boolean, children: React.ReactNode, variant?: "secondary" | "destructive" }) => (
    <div className={`flex items-center justify-between rounded-lg border p-3 ${variant === 'destructive' ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/50'}`}>
        <div className="flex items-center gap-3">
            <Icon className={`h-6 w-6 ${variant === 'destructive' ? 'text-destructive' : 'text-primary'}`} />
            <div>
                <h4 className="font-bold text-foreground">{title}</h4>
                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                    <p>{description}</p>
                    {cost !== undefined && <strong className="flex items-center gap-1">· {cost} <Gem className="h-3 w-3 text-cyan-400" /></strong>}
                </div>
            </div>
        </div>
        <Button size="sm" onClick={action} disabled={isLoading} variant={variant}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
        </Button>
    </div>
);


export default function RoomManagementDialog({ isOpen, setIsOpen, room }: RoomManagementDialogProps) {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState<(() => void) | null>(null);
  const [confirmDetails, setConfirmDetails] = useState({ title: '', description: '' });

  const [isExtending, setIsExtending] = useState(false);
  const [isIncreasingLimit, setIsIncreasingLimit] = useState(false);
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Editable details
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');

  if (!room) return null;

  const isHost = user?.uid === room.createdBy.uid;
  const isAdmin = userData?.role === 'admin';
  const canManage = isHost || isAdmin;
  
  const createConfirmation = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDetails({ title, description });
    setShowConfirm(() => onConfirm);
  };

  const handleUpdateDetails = async () => {
      if (!canManage || !room) return;
      setIsSavingDetails(true);
      try {
          await updateRoomDetails(room.id, user!.uid, { name, description });
          toast({ description: "Oda bilgileri güncellendi." });
      } catch (error: any) {
          toast({ variant: 'destructive', description: error.message });
      } finally {
          setIsSavingDetails(false);
      }
  }

  const handleDeleteRoom = async () => {
    if (!room || !user) return;
    setIsDeleting(true);
    try {
      await deleteRoomAsOwner(room.id, user.uid);
      toast({
        title: "Oda Silindi",
        description: `Odanız başarıyla silindi.`,
      });
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Oda silinirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowConfirm(null);
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


  if (!canManage) return null;


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2"><Settings className="h-6 w-6"/>Oda Yönetimi</DialogTitle>
            <DialogDescription>
              Odanızla ilgili ayarları buradan yapabilirsiniz. Bu işlemler elmas gerektirebilir.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
                <Label htmlFor="room-name">Oda Adı</Label>
                <Input id="room-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
             <div className="space-y-2">
                <Label htmlFor="room-desc">Oda Açıklaması</Label>
                <Textarea id="room-desc" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button onClick={handleUpdateDetails} disabled={isSavingDetails} className="w-full">
                {isSavingDetails && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Bilgileri Kaydet
            </Button>

            <div>
                <h3 className="mb-2 mt-4 text-sm font-semibold text-muted-foreground">Oda Güçlendirmeleri</h3>
                <div className="space-y-2">
                    <ActionCard title="Süreyi Uzat" description="Oda kapanma süresine +20 dk ekle" cost={15} icon={Clock} action={() => createConfirmation('Süreyi Uzat?', 'Bu işlem 15 elmasa mal olacak ve odanın kapanma süresine 20 dakika ekleyecek. Emin misiniz?', handleExtendTime)} isLoading={isExtending}>Uzat</ActionCard>
                    <ActionCard title="Katılımcı Artır" description="Maksimum katılımcı limitini +1 artır" cost={5} icon={UserPlus} action={() => createConfirmation('Limiti Artır?', 'Bu işlem 5 elmasa mal olacak ve oda limitini 1 artıracak. Emin misiniz?', handleIncreaseLimit)} isLoading={isIncreasingLimit}>Artır</ActionCard>
                </div>
            </div>

            <div>
                 <h3 className="mb-2 mt-4 text-sm font-semibold text-destructive">Tehlikeli Alan</h3>
                 <ActionCard title="Odayı Kalıcı Olarak Sil" description="Bu işlem geri alınamaz" icon={Trash2} action={() => createConfirmation('Odayı Sil?', 'Bu işlem geri alınamaz. Emin misiniz?', handleDeleteRoom)} isLoading={isDeleting} variant="destructive">Sil</ActionCard>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!showConfirm} onOpenChange={() => setShowConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><ShieldAlert className="text-destructive"/>{confirmDetails.title}</AlertDialogTitle>
            <AlertDialogDescription>
               {confirmDetails.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
                if(showConfirm) showConfirm();
                setShowConfirm(null);
            }}>
              Onayla
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
