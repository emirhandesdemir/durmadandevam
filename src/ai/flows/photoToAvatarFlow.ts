'use server';
/**
 * @fileOverview Kullanıcının yüklediği bir fotoğrafı çizgi film stili bir avatara dönüştüren Genkit akışı.
 *
 * - photoToAvatar - Bir fotoğrafı avatara dönüştüren ana fonksiyon.
 * - PhotoToAvatarInput - photoToAvatar fonksiyonunun giriş tipi.
 * - PhotoToAvatarOutput - photoToAvatar fonksiyonunun dönüş tipi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Giriş şeması: Avatara dönüştürülecek fotoğraf
const PhotoToAvatarInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Avatara dönüştürülecek fotoğraf. Data URI formatında olmalıdır: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type PhotoToAvatarInput = z.infer<typeof PhotoToAvatarInputSchema>;

// Çıkış şeması: Oluşturulan avatarın resim verisi
const PhotoToAvatarOutputSchema = z.object({
    avatarDataUri: z.string().describe("Oluşturulan avatar resminin Data URI'si.")
});
export type PhotoToAvatarOutput = z.infer<typeof PhotoToAvatarOutputSchema>;


// Dışa aktarılan ana fonksiyon
export async function photoToAvatar(input: PhotoToAvatarInput): Promise<PhotoToAvatarOutput> {
  return photoToAvatarFlow(input);
}


// Gemini 2.0 Flash ile resim üreten AI modeli
const imageGenerationModel = 'googleai/gemini-2.0-flash-preview-image-generation';


// Genkit akışı tanımı
const photoToAvatarFlow = ai.defineFlow(
  {
    name: 'photoToAvatarFlow',
    inputSchema: PhotoToAvatarInputSchema,
    outputSchema: PhotoToAvatarOutputSchema,
  },
  async (input) => {
    // Gemini modelini çağırarak resmi yeniden işle
    const { media } = await ai.generate({
        model: imageGenerationModel,
        prompt: [
            { media: { url: input.photoDataUri } },
            { text: "Turn this photo into a high-quality, Disney-Pixar style cartoon avatar. The output should be just the character on a simple, neutral background." }
        ],
        config: {
            // Hem resim hem metin çıktısı talep etmek, modelin daha iyi çalışmasını sağlar
            responseModalities: ['IMAGE', 'TEXT'],
            // Hata olasılığını azaltmak için güvenlik ayarlarını daha az kısıtlayıcı yap
            safetySettings: [
                { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            ],
        },
    });

    if (!media?.url) {
        throw new Error("AI modelinden resim çıktısı alınamadı.");
    }
    
    // Düzenlenmiş resmin data URI'sini döndür
    return {
        avatarDataUri: media.url
    };
  }
);
