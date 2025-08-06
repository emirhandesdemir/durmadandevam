'use server';

import { styleImage, type StyleImageInput } from '@/ai/flows/imageStyleFlow';

/**
 * Bir resme yapay zeka ile sanatsal bir filtre uygular.
 * Bu fonksiyon, Genkit akışını çağıran bir sarmalayıcıdır.
 * @param input - Resim verisi ve uygulanacak stili içeren nesne.
 * @returns Stil uygulanmış resmin data URI'sini içeren nesne.
 */
export async function applyImageFilter(input: StyleImageInput) {
    try {
        const result = await styleImage(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Resim filtresi uygulanırken hata oluştu:", error);
        // Hatanın gerçek mesajını istemciye gönder, böylece daha net bilgi alınır.
        return { success: false, error: error.message || "Bilinmeyen bir AI hatası oluştu." };
    }
}
