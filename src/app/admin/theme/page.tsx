// src/app/admin/theme/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Palette, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getThemeSettings, updateThemeSettings } from "@/lib/actions/themeActions";
import type { ThemeSettings, ColorTheme } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// HSL renk formatını doğrulayan regex
const hslRegex = /^\d{1,3}(\.\d+)?\s\d{1,3}(\.\d+)?%\s\d{1,3}(\.\d+)?%$/;
const hslErrorMessage = "Değer 'H S% L%' formatında olmalıdır (örn: 262.1 83.3% 57.8%)";

// Her bir renk grubu için Zod şeması
const colorThemeSchema = z.object({
  background: z.string().regex(hslRegex, { message: hslErrorMessage }),
  foreground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  card: z.string().regex(hslRegex, { message: hslErrorMessage }),
  cardForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  popover: z.string().regex(hslRegex, { message: hslErrorMessage }),
  popoverForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  primary: z.string().regex(hslRegex, { message: hslErrorMessage }),
  primaryForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  secondary: z.string().regex(hslRegex, { message: hslErrorMessage }),
  secondaryForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  muted: z.string().regex(hslRegex, { message: hslErrorMessage }),
  mutedForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  accent: z.string().regex(hslRegex, { message: hslErrorMessage }),
  accentForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  destructive: z.string().regex(hslRegex, { message: hslErrorMessage }),
  destructiveForeground: z.string().regex(hslRegex, { message: hslErrorMessage }),
  border: z.string().regex(hslRegex, { message: hslErrorMessage }),
  input: z.string().regex(hslRegex, { message: hslErrorMessage }),
  ring: z.string().regex(hslRegex, { message: hslErrorMessage }),
});

// Ana tema şeması (aydınlık ve karanlık mod)
const themeSettingsSchema = z.object({
  light: colorThemeSchema,
  dark: colorThemeSchema,
});


// Renk düzenleme alanını oluşturan yardımcı bileşen
const ColorInput = ({ control, name, label }: { control: any, name: any, label: string }) => (
    <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
            <div className="space-y-1.5">
                <Label htmlFor={name} className="capitalize">{label.replace(/([A-Z])/g, ' $1')}</Label>
                <div className="flex items-center gap-2">
                     <div className="h-10 w-10 shrink-0 rounded-md border" style={{ backgroundColor: `hsl(${field.value})` }} />
                    <Input id={name} {...field} placeholder="H S% L%" className={cn(error && "border-destructive")} />
                </div>
                {error && <p className="text-xs text-destructive">{error.message}</p>}
            </div>
        )}
    />
);


export default function ThemeSettingsPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);

    const form = useForm<ThemeSettings>({
        resolver: zodResolver(themeSettingsSchema),
    });

    useEffect(() => {
        getThemeSettings().then(data => {
            form.reset(data);
            setLoading(false);
        });
    }, [form]);

    const onSubmit = async (data: ThemeSettings) => {
        const result = await updateThemeSettings(data);
        if (result.success) {
            toast({ title: "Başarılı", description: "Tema ayarları kaydedildi. Değişikliklerin yansıması için sayfayı yenileyin." });
        } else {
            toast({ title: "Hata", description: `Kaydedilirken bir hata oluştu: ${result.error}`, variant: "destructive" });
        }
    };
    
    if (loading) {
        return (
             <div>
                 <Skeleton className="h-10 w-1/3 mb-2" />
                 <Skeleton className="h-6 w-2/3 mb-8" />
                 <Card><CardContent className="p-6"><Skeleton className="h-64 w-full" /></CardContent></Card>
            </div>
        )
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Palette className="h-8 w-8 text-primary" />
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tema Editörü</h1>
                        <p className="text-muted-foreground mt-1">
                            Uygulamanın renk paletini buradan yönetin. HSL formatında değerler girin (örn: 262.1 83.3% 57.8%).
                        </p>
                    </div>
                </div>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Değişiklikleri Kaydet
                </Button>
            </div>

            <Tabs defaultValue="light" className="mt-8">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="light">Aydınlık Tema</TabsTrigger>
                    <TabsTrigger value="dark">Karanlık Tema</TabsTrigger>
                </TabsList>
                <TabsContent value="light">
                    <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(colorThemeSchema.shape).map(key => (
                            <ColorInput key={key} control={form.control} name={`light.${key}`} label={key}/>
                        ))}
                    </CardContent></Card>
                </TabsContent>
                 <TabsContent value="dark">
                    <Card><CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         {Object.keys(colorThemeSchema.shape).map(key => (
                            <ColorInput key={key} control={form.control} name={`dark.${key}`} label={key}/>
                        ))}
                    </CardContent></Card>
                </TabsContent>
            </Tabs>
        </form>
    );
}
