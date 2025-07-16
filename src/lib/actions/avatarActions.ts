// src/lib/actions/avatarActions.ts
'use server';

import { photoToAvatar, type PhotoToAvatarInput } from '@/ai/flows/photoToAvatarFlow';

/**
 * Kullanıcının yüklediği bir fotoğrafı yapay zeka ile bir avatara dönüştürür.
 * Bu fonksiyon, ilgili Genkit akışını çağıran bir sarmalayıcıdır.
 * @param input - Fotoğraf verisini içeren nesne.
 * @returns Oluşturulan avatarın data URI'sini içeren nesne.
 */
export async function convertPhotoToAvatar(input: PhotoToAvatarInput) {
    try {
        const result = await photoToAvatar(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Fotoğraf avatara dönüştürülürken hata oluştu:", error);
        return { success: false, error: error.message || "Bilinmeyen bir AI hatası oluştu." };
    }
}
