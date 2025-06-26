'use server';
/**
 * @fileOverview Yapay zeka ile resimlere sanatsal stiller uygulayan bir Genkit akışı.
 *
 * - styleImage - Verilen bir resme belirli bir stili uygulayan ana fonksiyon.
 * - StyleImageInput - styleImage fonksiyonunun giriş tipi.
 * - StyleImageOutput - styleImage fonksiyonunun dönüş tipi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Giriş şeması: Resim verisi ve stil adı
const StyleImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Stil uygulanacak resim. Data URI formatında olmalıdır: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  style: z.string().describe('Uygulanacak stilin açıklaması (örn: "vintage film filter").'),
});
export type StyleImageInput = z.infer<typeof StyleImageInputSchema>;

// Çıkış şeması: Stil uygulanmış resim verisi
const StyleImageOutputSchema = z.object({
    styledPhotoDataUri: z.string().describe("Stil uygulanmış resmin Data URI'si.")
});
export type StyleImageOutput = z.infer<typeof StyleImageOutputSchema>;


// Dışa aktarılan ana fonksiyon
export async function styleImage(input: StyleImageInput): Promise<StyleImageOutput> {
  return styleImageFlow(input);
}


// Gemini 2.0 Flash ile resim üreten AI modeli
const imageGenerationModel = 'googleai/gemini-2.0-flash-preview-image-generation';


// Genkit akışı tanımı
const styleImageFlow = ai.defineFlow(
  {
    name: 'styleImageFlow',
    inputSchema: StyleImageInputSchema,
    outputSchema: StyleImageOutputSchema,
  },
  async (input) => {
    // Gemini modelini çağırarak resmi yeniden işle
    const { media } = await ai.generate({
        model: imageGenerationModel,
        prompt: [
            { media: { url: input.photoDataUri } },
            { text: `Apply this style to the image: ${input.style}` }
        ],
        config: {
            // Hem resim hem metin çıktısı talep etmek, modelin daha iyi çalışmasını sağlar
            responseModalities: ['IMAGE', 'TEXT'],
        },
    });

    if (!media?.url) {
        throw new Error("AI modelinden resim çıktısı alınamadı.");
    }
    
    // Stil uygulanmış resmin data URI'sini döndür
    return {
        styledPhotoDataUri: media.url
    };
  }
);
