'use server';
/**
 * @fileOverview Kullanıcının metin istemine göre yapay zeka ile bir avatar oluşturur.
 *
 * - generateAvatar - Metin girdisinden bir avatar resmi oluşturur veya mevcut bir avatarı günceller.
 * - GenerateAvatarInput - Fonksiyonun giriş tipi.
 * - GenerateAvatarOutput - Fonksiyonun dönüş tipi.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Giriş şeması
export const GenerateAvatarInputSchema = z.object({
  prompt: z.string().describe('Oluşturulacak veya güncellenecek avatarın detaylı açıklaması. Örneğin: "siyah deri ceket giydir", "saçını sarı yap"'),
  baseAvatarDataUri: z.string().optional().describe("Eğer bir düzenleme yapılıyorsa, temel alınacak mevcut avatarın Data URI'si."),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

// Çıkış şeması
export const GenerateAvatarOutputSchema = z.object({
  avatarDataUri: z.string().describe("Oluşturulan veya güncellenen avatar resminin Data URI'si."),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

// Dışa aktarılan ana fonksiyon
export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const imageGenerationModel = 'googleai/gemini-1.5-flash-preview';

// Genkit akışı tanımı
const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({ prompt, baseAvatarDataUri }) => {

    const generationPrompt: any[] = [];
    
    // Eğer düzenlenecek bir temel avatar varsa, bunu prompt'un başına ekle.
    if (baseAvatarDataUri) {
        generationPrompt.push({ media: { url: baseAvatarDataUri } });
        generationPrompt.push({ text: `Apply the following change to the character in the image, maintaining the same character, art style, and background. Style change: "${prompt}"` });
    } else {
        // Sıfırdan bir avatar oluşturuyorsak
        generationPrompt.push({ text: `Generate a full body shot of a 3D character based on the following description. The character should be centered against a simple, plain background. Style: modern, clean, Pixar-like. Description: "${prompt}"` });
    }

    const { media } = await ai.generate({
      model: imageGenerationModel,
      prompt: generationPrompt,
      config: {
        responseModalities: ['IMAGE', 'TEXT'],
        safetySettings: [
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        ],
      },
    });

    if (!media?.url) {
      throw new Error("AI modelinden avatar resmi oluşturulamadı.");
    }
    
    return {
      avatarDataUri: media.url,
    };
  }
);
