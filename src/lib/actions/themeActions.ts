// src/lib/actions/themeActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { ThemeSettings } from '../types';

/**
 * Mevcut tema ayarlarını Firestore'dan alır.
 * Eğer bir ayar bulunamazsa, varsayılan renkleri döndürür.
 * @returns {Promise<ThemeSettings>} Tema ayarları nesnesi.
 */
export async function getThemeSettings(): Promise<ThemeSettings> {
    const themeRef = doc(db, 'config', 'theme');
    const docSnap = await getDoc(themeRef);

    if (docSnap.exists()) {
        return docSnap.data() as ThemeSettings;
    }

    // Varsayılan tema (eğer Firestore'da kayıt yoksa)
    return {
        light: {
            background: "0 0% 100%",
            foreground: "240 10% 3.9%",
            card: "0 0% 100%",
            cardForeground: "240 10% 3.9%",
            popover: "0 0% 100%",
            popoverForeground: "240 10% 3.9%",
            primary: "262.1 83.3% 57.8%",
            primaryForeground: "0 0% 100%",
            secondary: "240 4.8% 95.9%",
            secondaryForeground: "240 5.9% 10%",
            muted: "240 4.8% 95.9%",
            mutedForeground: "240 3.8% 46.1%",
            accent: "240 4.8% 95.9%",
            accentForeground: "240 5.9% 10%",
            destructive: "0 84.2% 60.2%",
            destructiveForeground: "0 0% 100%",
            border: "240 5.9% 90%",
            input: "240 5.9% 90%",
            ring: "262.1 83.3% 57.8%",
        },
        dark: {
            background: "240 10% 3.9%",
            foreground: "210 40% 98%",
            card: "240 4.8% 11.0%",
            cardForeground: "210 40% 98%",
            popover: "240 10% 3.9%",
            popoverForeground: "210 40% 98%",
            primary: "262.1 83.3% 57.8%",
            primaryForeground: "210 40% 98%",
            secondary: "217.2 32.6% 17.5%",
            secondaryForeground: "210 40% 98%",
            muted: "217.2 32.6% 17.5%",
            mutedForeground: "215 20.2% 65.1%",
            accent: "217.2 32.6% 17.5%",
            accentForeground: "210 40% 98%",
            destructive: "0 62.8% 30.6%",
            destructiveForeground: "210 40% 98%",
            border: "217.2 32.6% 17.5%",
            input: "217.2 32.6% 17.5%",
            ring: "262.1 83.3% 57.8%",
        },
        radius: "1rem",
        font: "var(--font-jakarta)"
    };
}

/**
 * Tema ayarlarını Firestore'da günceller.
 * @param {ThemeSettings} newTheme Yeni tema ayarları nesnesi.
 * @returns İşlemin başarı durumunu içeren bir nesne.
 */
export async function updateThemeSettings(newTheme: ThemeSettings) {
    const themeRef = doc(db, 'config', 'theme');
    try {
        await setDoc(themeRef, newTheme, { merge: true });
        // Ana layout'u yeniden doğrula, böylece yeni stiller tüm kullanıcılara yansır.
        revalidatePath('/', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Tema ayarları güncellenirken hata:", error);
        return { success: false, error: error.message };
    }
}
