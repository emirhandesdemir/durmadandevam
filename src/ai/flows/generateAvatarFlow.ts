'use server';
/**
 * @fileOverview Kullanıcının metin komutlarına göre yapay zeka ile bir avatar oluşturan bir Genkit akışı.
 *
 * - generateAvatar - Verilen bir metin komutundan bir avatar resmi oluşturan ana fonksiyon.
 * - GenerateAvatarInput - generateAvatar fonksiyonunun giriş tipi.
 * - GenerateAvatarOutput - generateAvatar fonksiyonunun dönüş tipi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Giriş şeması: Avatar için metin komutu
const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('Oluşturulacak avatarın metin olarak açıklaması (örn: "mavi saçlı, gözlüklü bir kedi").'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

// Çıkış şeması: Oluşturulan avatarın resim verisi
const GenerateAvatarOutputSchema = z.object({
    avatarDataUri: z.string().describe("Oluşturulan avatar resminin Data URI'si.")
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;


// Dışa aktarılan ana fonksiyon
export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}


// Gemini 1.5 Flash ile resim üreten AI modeli
const imageGenerationModel = 'googleai/gemini-1.5-flash-preview';


// Genkit akışı tanımı
const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async (input) => {
    // Gemini modelini çağırarak resmi oluştur
    const { media } = await ai.generate({
        model: imageGenerationModel,
        prompt: `Generate a high-quality, Disney-Pixar style cartoon avatar based on the following description. The avatar should be just the character on a plain, neutral background. Description: ${input.prompt}`,
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
    
    // Oluşturulan avatarın data URI'sini döndür
    return {
        avatarDataUri: media.url
    };
  }
);
