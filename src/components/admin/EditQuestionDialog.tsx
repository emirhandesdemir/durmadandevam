// src/components/admin/EditQuestionDialog.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { addQuestion, updateQuestion } from "@/lib/actions/gameActions";
import { GameQuestion } from "@/lib/types";

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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";

interface EditQuestionDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  question: GameQuestion | null; // Düzenlenecek soru. Null ise yeni soru eklenir.
}

// Form alanlarının validasyonunu (doğrulamasını) yöneten Zod şeması.
const questionSchema = z.object({
  question: z.string().min(10, "Soru en az 10 karakter olmalıdır."),
  options: z.array(z.string().min(1, "Seçenek boş olamaz.")).length(4, "Tam olarak 4 seçenek olmalıdır."),
  correctOptionIndex: z.coerce.number().min(0).max(3),
});

/**
 * Quiz sorusu eklemek veya düzenlemek için kullanılan dialog (modal) bileşeni.
 */
export default function EditQuestionDialog({ isOpen, setIsOpen, question }: EditQuestionDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = !!question; // `question` prop'u varsa düzenleme modundayız.

  // react-hook-form ile form yönetimi.
  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      question: "",
      options: ["", "", "", ""],
      correctOptionIndex: 0,
    },
  });

  // Seçenekleri dinamik olarak yönetmek için `useFieldArray`.
  const { fields } = useFieldArray({
      control: form.control,
      name: "options"
  });

  // Düzenleme modunda, dialog açıldığında formu mevcut soru verileriyle doldur.
  useEffect(() => {
    if (isOpen && question) {
      form.reset({
        question: question.question,
        options: question.options,
        correctOptionIndex: question.correctOptionIndex,
      });
    } else if (isOpen && !question) {
      form.reset(); // Yeni soru eklerken formu sıfırla.
    }
  }, [isOpen, question, form]);

  // Form gönderildiğinde çalışacak fonksiyon.
  const onSubmit = async (data: z.infer<typeof questionSchema>) => {
    setIsSubmitting(true);
    try {
      if (isEditMode && question) {
        // Düzenleme modundaysa güncelleme işlemini yap.
        await updateQuestion(question.id, data);
        toast({ title: "Başarılı", description: "Soru güncellendi." });
      } else {
        // Ekleme modundaysa yeni soru oluştur.
        await addQuestion(data);
        toast({ title: "Başarılı", description: "Yeni soru eklendi." });
      }
      setIsOpen(false); // İşlem sonrası dialogu kapat.
    } catch (error) {
      console.error("Soru kaydedilirken hata:", error);
      toast({ title: "Hata", description: "İşlem sırasında bir hata oluştu.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Soruyu Düzenle" : "Yeni Soru Ekle"}</DialogTitle>
          <DialogDescription>
            Quiz oyunu için bir soru ve dört seçenek girin. Doğru seçeneği işaretlemeyi unutmayın.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Soru Metni</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Örn: Türkiye'nin başkenti neresidir?" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="correctOptionIndex"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Seçenekler (Doğru olanı işaretleyin)</FormLabel>
                  <FormControl>
                    <RadioGroup
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                        className="space-y-2"
                    >
                      {fields.map((item, index) => (
                        <FormField
                            key={item.id}
                            control={form.control}
                            name={`options.${index}`}
                            render={({ field: optionField }) => (
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl>
                                        <RadioGroupItem value={String(index)} />
                                    </FormControl>
                                    <Input {...optionField} placeholder={`Seçenek ${index + 1}`} />
                                </FormItem>
                            )}
                        />
                      ))}
                    </RadioGroup>
                  </FormControl>
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
                {isEditMode ? "Değişiklikleri Kaydet" : "Soruyu Ekle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
