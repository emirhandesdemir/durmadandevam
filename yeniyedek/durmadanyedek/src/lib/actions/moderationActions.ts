'use server';

import { moderateImage, type ModerateImageInput, type ModerateImageOutput } from '@/ai/flows/moderateImageFlow';

/**
 * Bir görüntünün güvenli olup olmadığını kontrol eder.
 * @param input Resim verisini içeren nesne.
 * @returns Başarı durumu ve denetim sonucunu içeren nesne.
 */
export async function checkImageSafety(input: ModerateImageInput): Promise<{ success: boolean; data?: ModerateImageOutput, error?: string }> {
    try {
        const result = await moderateImage(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Resim denetimi sırasında hata oluştu:", error);
        return { success: false, error: error.message || "Resim denetlenemedi. Lütfen tekrar deneyin." };
    }
}
