// Bu bileşen, `next-themes` kütüphanesini kullanarak
// uygulama genelinde tema (aydınlık/karanlık mod) yönetimini sağlar.
// Root layout'ta tüm uygulamayı sarmalar.
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // `next-themes`'in kendi sağlayıcısını kullanarak tema işlevselliğini alt bileşenlere aktarır.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
