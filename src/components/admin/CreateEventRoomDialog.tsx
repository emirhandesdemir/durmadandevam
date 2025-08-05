// src/components/admin/CreateEventRoomDialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { createEventRoom } from "@/lib/actions/roomActions";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Room } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, KeyRound } from "lucide-react";

interface CreateEventRoomDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  room: Room | null; // For editing in the future
}

const formSchema = z.object({
  name: z.string().min(5, "Oda adı en az 5 karakter olmalıdır."),
  description: z.string().min(10, "Açıklama en az 10 karakter olmalıdır."),
  pin: z.string().min(4, "PIN en az 4 karakter olmalıdır."),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateEventRoomDialog({ isOpen, setIsOpen, room }: CreateEventRoomDialogProps) {
  const { toast } = useToast();
  const { user, userData } = useAuth();
  const { i18n } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!room;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: room?.name || "",
      description: room?.description || "",
      pin: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!user || !userData || userData.role !== 'admin') {
      toast({ variant: 'destructive', description: "Bu işlemi yapma yetkiniz yok." });
      return;
    }

    setIsSubmitting(true);
    try {
        await createEventRoom(user.uid, { name: data.name, description: data.description, language: i18n.language }, {
            username: userData.username,
            photoURL: userData.photoURL || null,
            role: userData.role,
            selectedAvatarFrame: userData.selectedAvatarFrame || '',
        }, data.pin);
        toast({ title: "Başarılı", description: "Etkinlik odası başarıyla oluşturuldu." });
        setIsOpen(false);
        form.reset();
    } catch (error: any) {
      toast({ title: "Hata", description: `Oda oluşturulurken bir hata oluştu: ${error.message}`, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Etkinliği Düzenle" : "Yeni Etkinlik Odası Oluştur"}</DialogTitle>
          <DialogDescription>
            Etkinlik odaları süresizdir ve listede öne çıkarılır. Bu işlemi yapmak için yönetici PIN'ini girmelisiniz.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etkinlik Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="Örn: Yılbaşı Özel Çekilişi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etkinlik Açıklaması</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Bu odada yapılacak etkinlikler hakkında kısa bilgi." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="pin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Yönetici PIN'i</FormLabel>
                   <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
                    <FormControl>
                        <Input type="password" placeholder="PIN girin" {...field} className="pl-10" />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                İptal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Değişiklikleri Kaydet" : "Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
