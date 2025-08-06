// src/app/admin/theme/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Palette, Loader2, Type, Scaling, Settings, Image as ImageIcon, Sun, Moon, Laptop, AppWindow } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getThemeSettings, updateThemeSettings } from "@/lib/actions/themeActions";
import type { ThemeSettings } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";


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

// Ana tema şeması (tüm ayarları içerir)
const themeSettingsSchema = z.object({
  light: colorThemeSchema,
  dark: colorThemeSchema,
  radius: z.string().regex(/^\d(\.\d+)?rem$/, "Değer '0.5rem' gibi bir formatta olmalıdır."),
  font: z.string().min(1, "Bir yazı tipi seçilmelidir."),
  appName: z.string().min(1, "Uygulama adı boş olamaz.").optional(),
  appLogoUrl: z.string().url("Geçerli bir URL girin.").optional().or(z.literal("")),
  defaultMode: z.enum(['light', 'dark', 'system']).optional(),
});

const fontOptions = [
    { name: 'Plus Jakarta Sans', value: 'var(--font-jakarta)' },
    { name: 'Inter', value: 'var(--font-inter)' },
    { name: 'Poppins', value: 'var(--font-poppins)' },
    { name: 'Lato', value: 'var(--font-lato)' },
];

const ColorInput = ({ control, name, label }: { control: any, name: any, label: string }) => (
    <FormField
        control={control}
        name={name}
        render={({ field }) => (
            <FormItem>
                <FormLabel className="capitalize text-xs">{label.replace(/([A-Z])/g, ' $1')}</FormLabel>
                <FormControl>
                    <div className="flex items-center gap-2">
                        <div className="h-10 w-10 shrink-0 rounded-md border" style={{ backgroundColor: `hsl(${field.value})` }} />
                        <Input placeholder="H S% L%" {...field} />
                    </div>
                </FormControl>
                <FormMessage />
            </FormItem>
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
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Palette className="h-8 w-8 text-primary" />
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Tema Editörü</h1>
                            <p className="text-muted-foreground mt-1">
                                Uygulamanın renk paletini, yazı tipini ve yerleşimini buradan yönetin.
                            </p>
                        </div>
                    </div>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Değişiklikleri Kaydet
                    </Button>
                </div>
                 
                 <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">
                     <div className="space-y-8">
                         <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <AppWindow className="h-6 w-6 text-muted-foreground" />
                                    <CardTitle>Uygulama Kimliği</CardTitle>
                                </div>
                                <CardDescription>Uygulamanın genel adı ve logosu.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <FormField control={form.control} name="appName" render={({ field }) => (
                                    <FormItem><FormLabel>Uygulama Adı</FormLabel><FormControl><Input placeholder="HiweWalk" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <FormField control={form.control} name="appLogoUrl" render={({ field }) => (
                                    <FormItem><FormLabel>Logo URL'si</FormLabel><FormControl><Input placeholder="https://example.com/logo.png" {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Settings className="h-6 w-6 text-muted-foreground" />
                                    <CardTitle>Genel Ayarlar</CardTitle>
                                </div>
                                <CardDescription>Uygulamanın genel görünüm ve davranış ayarları.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <FormField control={form.control} name="defaultMode" render={({ field }) => (
                                     <FormItem className="space-y-3">
                                        <FormLabel>Varsayılan Tema Modu</FormLabel>
                                         <RadioGroup onValueChange={field.onChange} value={field.value} className="grid grid-cols-3 gap-2 pt-2">
                                            <Label htmlFor="light-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                            <FormControl><RadioGroupItem value="light" id="light-theme" className="sr-only" /></FormControl>
                                            <Sun className="mb-2 h-6 w-6" /><span className="text-xs font-bold">Aydınlık</span>
                                            </Label>
                                            <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                            <FormControl><RadioGroupItem value="dark" id="dark-theme" className="sr-only" /></FormControl>
                                            <Moon className="mb-2 h-6 w-6" /><span className="text-xs font-bold">Karanlık</span>
                                            </Label>
                                            <Label htmlFor="system-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
                                            <FormControl><RadioGroupItem value="system" id="system-theme" className="sr-only" /></FormControl>
                                            <Laptop className="mb-2 h-6 w-6" /><span className="text-xs font-bold">Sistem</span>
                                            </Label>
                                        </RadioGroup>
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>
                     </div>
                     <div className="space-y-8">
                         <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Scaling className="h-6 w-6 text-muted-foreground" />
                                    <CardTitle>Yerleşim & Tipografi</CardTitle>
                                </div>
                                <CardDescription>Uygulamanın köşe yuvarlaklığı ve yazı tipi gibi temel stil ayarları.</CardDescription>
                            </CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-8">
                                <FormField control={form.control} name="radius" render={({ field }) => (
                                    <FormItem><FormLabel>Köşe Yuvarlaklığı ({parseFloat(field.value || "1").toFixed(1)}rem)</FormLabel>
                                    <FormControl><Slider value={[parseFloat(field.value || "1")]} onValueChange={(vals) => field.onChange(`${vals[0].toFixed(1)}rem`)} min={0} max={2} step={0.1} /></FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                                 <FormField control={form.control} name="font" render={({ field }) => (
                                    <FormItem><FormLabel>Yazı Tipi</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Bir yazı tipi seçin" /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {fontOptions.map(opt => (<SelectItem key={opt.value} value={opt.value}><span style={{ fontFamily: opt.value.replace(/var\((--font-\w+)\)/, "var($1)") }}>{opt.name}</span></SelectItem>))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                    </FormItem>
                                )} />
                            </CardContent>
                        </Card>
                     </div>
                 </div>
                
                <Tabs defaultValue="light" className="mt-8">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="light">Aydınlık Tema Renkleri</TabsTrigger>
                        <TabsTrigger value="dark">Karanlık Tema Renkleri</TabsTrigger>
                    </TabsList>
                    <TabsContent value="light">
                        <Card><CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                            {Object.keys(colorThemeSchema.shape).map(key => (
                                <ColorInput key={`light.${key}`} control={form.control} name={`light.${key}`} label={key}/>
                            ))}
                        </CardContent></Card>
                    </TabsContent>
                    <TabsContent value="dark">
                        <Card><CardContent className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-8">
                            {Object.keys(colorThemeSchema.shape).map(key => (
                                <ColorInput key={`dark.${key}`} control={form.control} name={`dark.${key}`} label={key}/>
                            ))}
                        </CardContent></Card>
                    </TabsContent>
                </Tabs>
            </form>
        </Form>
    );
}
