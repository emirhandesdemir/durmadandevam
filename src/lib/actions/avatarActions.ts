// src/lib/actions/avatarActions.ts
'use server';

import { generateAvatar, type GenerateAvatarInput } from '@/ai/flows/generateAvatarFlow';
import { photoToAvatar, type PhotoToAvatarInput } from '@/ai/flows/photoToAvatarFlow';

/**
 * Kullanıcının metin istemine göre yapay zeka ile bir avatar oluşturur.
 * Bu fonksiyon, ilgili Genkit akışını çağıran bir sarmalayıcıdır.
 * @param input - Avatar için metin istemini içeren nesne.
 * @returns Oluşturulan avatarın data URI'sini içeren nesne.
 */
export async function createAvatarFromText(input: GenerateAvatarInput) {
    try {
        const result = await generateAvatar(input);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Metinden avatar oluşturulurken hata oluştu:", error);
        return { success: false, error: error.message || "Bilinmeyen bir AI hatası oluştu." };
    }
}

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
