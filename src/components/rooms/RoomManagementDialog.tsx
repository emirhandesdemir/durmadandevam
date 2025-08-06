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
import { deleteRoomAsOwner, extendRoomTime, increaseParticipantLimit, extendRoomFor30Days, updateRoomSettings } from "@/lib/actions/roomActions";
import { Trash2, Loader2, ShieldAlert, Clock, UserPlus, Gem, CalendarDays, Puzzle, Settings, Zap } from "lucide-react";
import type { Room } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "../ui/switch";
import { Label } from "../ui/label";
import OpenPortalDialog from "./OpenPortalDialog";

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
  const { user, userData, refreshUserData } = useAuth();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState<(() => void) | null>(null);
  const [confirmDetails, setConfirmDetails] = useState({ title: '', description: '' });

  const [isExtending, setIsExtending] = useState(false);
  const [isIncreasingLimit, setIsIncreasingLimit] = useState(false);
  const [isExtending30Days, setIsExtending30Days] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isPortalDialogOpen, setIsPortalDialogOpen] = useState(false);
  
  const [autoQuizEnabled, setAutoQuizEnabled] = useState(room?.autoQuizEnabled ?? true);


  if (!room) return null;

  const isHost = user?.uid === room.createdBy.uid;
  const isAdmin = userData?.role === 'admin';
  const canManage = isHost || isAdmin;
  
  const createConfirmation = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDetails({ title, description });
    setShowConfirm(() => onConfirm);
  };

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
          await refreshUserData();
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
        await refreshUserData();
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
        await refreshUserData();
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
      if (!room || !user || !canManage) return;
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

  if (!canManage) return null;


  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
             <DialogTitle className="flex items-center gap-2"><Settings className="h-6 w-6"/>Oda Yönetimi: {room.name}</DialogTitle>
            <DialogDescription>
              Odanızla ilgili ayarları buradan yapabilirsiniz. Bu işlemler elmas gerektirebilir.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
             <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Genel Ayarlar</h3>
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
                        Ayarları Kaydet
                    </Button>
                </div>
            </div>

            <div>
                <h3 className="mb-2 text-sm font-semibold text-muted-foreground">Oda Güçlendirmeleri</h3>
                <div className="space-y-2">
                    <ActionCard title="Portal Aç" description="Odanı 5 dk boyunca her yerde duyur" cost={100} icon={Zap} action={() => createConfirmation('Portalı Aç?', 'Bu işlem 100 elmasa mal olacak ve odanızı 5 dakika boyunca tüm odalarda duyuracak. Emin misiniz?', () => setIsPortalDialogOpen(true))} isLoading={false}>Aç</ActionCard>
                    <ActionCard title="Süreyi Uzat" description="Oda kapanma süresine +20 dk ekle" cost={15} icon={Clock} action={() => createConfirmation('Süreyi Uzat?', 'Bu işlem 15 elmasa mal olacak ve odanın kapanma süresine 20 dakika ekleyecek. Emin misiniz?', handleExtendTime)} isLoading={isExtending}>Uzat</ActionCard>
                    <ActionCard title="Katılımcı Artır" description="Maksimum katılımcı limitini +1 artır" cost={5} icon={UserPlus} action={() => createConfirmation('Limiti Artır?', 'Bu işlem 5 elmasa mal olacak ve oda limitini 1 artıracak. Emin misiniz?', handleIncreaseLimit)} isLoading={isIncreasingLimit}>Artır</ActionCard>
                    <ActionCard title="Odayı 1 Ay Uzat" description="Odanı 30 gün boyunca açık tut" cost={500} icon={CalendarDays} action={() => createConfirmation('30 Gün Uzat?', 'Bu işlem 500 elmasa mal olacak ve odanızın süresini 30 güne ayarlayacak. Emin misiniz?', handleExtendFor30Days)} isLoading={isExtending30Days}>Satın Al</ActionCard>
                </div>
            </div>

            <div>
                 <h3 className="mb-2 text-sm font-semibold text-destructive">Tehlikeli Alan</h3>
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

      <OpenPortalDialog
        isOpen={isPortalDialogOpen}
        onOpenChange={setIsPortalDialogOpen}
        roomId={room.id}
        roomName={room.name}
      />
    </>
  );
}
