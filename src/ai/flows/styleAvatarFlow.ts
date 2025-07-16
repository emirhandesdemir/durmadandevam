'use server';
/**
 * @fileOverview Kullanıcının metin komutlarına göre mevcut bir avatarı düzenler.
 *
 * - styleAvatar - Bir avatara stil uygular.
 * - StyleAvatarInput - Fonksiyonun giriş tipi.
 * - StyleAvatarOutput - Fonksiyonun dönüş tipi.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Giriş şeması
export const StyleAvatarInputSchema = z.object({
  avatarDataUri: z
    .string()
    .describe(
      "Stil uygulanacak temel avatar resmi. Data URI formatında olmalıdır."
    ),
  prompt: z.string().describe('Avatara uygulanacak stil değişikliği (örn: "add glasses", "make hair blue").'),
});
export type StyleAvatarInput = z.infer<typeof StyleAvatarInputSchema>;

// Çıkış şeması
export const StyleAvatarOutputSchema = z.object({
    styledAvatarDataUri: z.string().describe("Stil uygulanmış avatar resminin Data URI'si.")
});
export type StyleAvatarOutput = z.infer<typeof StyleAvatarOutputSchema>;

// Dışa aktarılan ana fonksiyon
export async function styleAvatar(input: StyleAvatarInput): Promise<StyleAvatarOutput> {
  return styleAvatarFlow(input);
}

const imageGenerationModel = 'googleai/gemini-1.5-flash-preview';

// Genkit akışı tanımı
const styleAvatarFlow = ai.defineFlow(
  {
    name: 'styleAvatarFlow',
    inputSchema: StyleAvatarInputSchema,
    outputSchema: StyleAvatarOutputSchema,
  },
  async ({ avatarDataUri, prompt }) => {
    const { media } = await ai.generate({
      model: imageGenerationModel,
      prompt: [
          { media: { url: avatarDataUri } },
          { text: `Apply the following style change to the character in the image, maintaining the same character and art style. Style change: "${prompt}"` }
      ],
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
      throw new Error("AI modelinden stilize edilmiş resim alınamadı.");
    }
    
    return {
      styledAvatarDataUri: media.url,
    };
  }
);
