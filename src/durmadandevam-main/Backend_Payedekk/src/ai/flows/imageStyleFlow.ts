'use server';
/**
 * @fileOverview Kullanıcının metin komutlarına göre yapay zeka ile resimleri düzenleyen bir Genkit akışı.
 *
 * - styleImage - Verilen bir resme metin tabanlı bir komut uygulayan ana fonksiyon.
 * - StyleImageInput - styleImage fonksiyonunun giriş tipi.
 * - StyleImageOutput - styleImage fonksiyonunun dönüş tipi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Giriş şeması: Resim verisi ve düzenleme komutu
const StyleImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Düzenlenecek resim. Data URI formatında olmalıdır: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  style: z.string().describe('Resme uygulanacak değişikliğin metin olarak açıklaması (örn: "make it a watercolor painting").'),
});
export type StyleImageInput = z.infer<typeof StyleImageInputSchema>;

// Çıkış şeması: Düzenlenmiş resim verisi
const StyleImageOutputSchema = z.object({
    styledPhotoDataUri: z.string().describe("Düzenlenmiş resmin Data URI'si.")
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
            { text: `Apply the following instruction to the image: ${input.style}` }
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
        styledPhotoDataUri: media.url
    };
  }
);
