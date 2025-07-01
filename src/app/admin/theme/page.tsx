// src/app/admin/theme/page.tsx
"use client";

import { useTheme } from "next-themes";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Palette, Sun, Moon, Laptop } from "lucide-react";

/**
 * Yönetim Paneli - Tema Ayarları Sayfası
 * 
 * Bu sayfa, yöneticinin tüm uygulama genelinde kullanılacak
 * renk modunu (Aydınlık, Karanlık veya Sistem Varsayılanı) seçmesine olanak tanır.
 */
export default function ThemeSettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div>
      <div className="flex items-center gap-4">
        <Palette className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tema Ayarları</h1>
          <p className="text-muted-foreground mt-1">
            Uygulamanın genel görünümünü (renkler, karanlık/aydınlık mod) yönetin.
          </p>
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Uygulama Teması</CardTitle>
          <CardDescription>
            Uygulama genelinde kullanılacak renk modunu seçin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Aydınlık Tema Seçeneği */}
            <Label htmlFor="light-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
              <RadioGroupItem value="light" id="light-theme" className="sr-only" />
              <Sun className="mb-3 h-8 w-8" />
              <span className="font-bold">Aydınlık</span>
            </Label>

            {/* Karanlık Tema Seçeneği */}
            <Label htmlFor="dark-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
              <RadioGroupItem value="dark" id="dark-theme" className="sr-only" />
              <Moon className="mb-3 h-8 w-8" />
              <span className="font-bold">Karanlık</span>
            </Label>
            
            {/* Sistem Varsayılanı Tema Seçeneği */}
            <Label htmlFor="system-theme" className="flex flex-col items-center justify-center rounded-lg border-2 bg-card p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer">
              <RadioGroupItem value="system" id="system-theme" className="sr-only" />
              <Laptop className="mb-3 h-8 w-8" />
              <span className="font-bold">Sistem</span>
            </Label>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  );
}
