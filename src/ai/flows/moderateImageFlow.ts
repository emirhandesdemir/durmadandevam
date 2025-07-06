
'use server';
/**
 * @fileOverview Görüntüleri müstehcen içerik için denetleyen bir Genkit akışı.
 *
 * - moderateImage - Bir görüntünün güvenli olup olmadığını kontrol eder.
 * - ModerateImageInput - moderateImage fonksiyonunun giriş tipi.
 * - ModerateImageOutput - moderateImage fonksiyonunun dönüş tipi.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {FinishReason} from '@genkit-ai/ai';

const ModerateImageInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "Denetlenecek resim. Data URI formatında olmalıdır: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ModerateImageInput = z.infer<typeof ModerateImageInputSchema>;

const ModerateImageOutputSchema = z.object({
    isSafe: z.boolean().describe("Görüntünün güvenli olup olmadığı."),
    reason: z.string().describe("Güvenli değilse, sebebi.")
});
export type ModerateImageOutput = z.infer<typeof ModerateImageOutputSchema>;

export async function moderateImage(input: ModerateImageInput): Promise<ModerateImageOutput> {
  return moderateImageFlow(input);
}

const moderateImageFlow = ai.defineFlow(
  {
    name: 'moderateImageFlow',
    inputSchema: ModerateImageInputSchema,
    outputSchema: ModerateImageOutputSchema,
  },
  async (input) => {
    try {
        const { candidates } = await ai.generate({
            model: 'googleai/gemini-2.0-flash',
            prompt: [
                { text: "Analyze this image for safety. You don't need to produce text output, just safety ratings." },
                { media: { url: input.photoDataUri } }
            ],
            config: {
              // Denetleyiciyi daha az katı olacak şekilde yapılandır, sadece yüksek olasılıklı
              // sakıncalı içeriği engelle. Bu, yanlış pozitifleri azaltır.
              safetySettings: [
                {
                  category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_HATE_SPEECH',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_HARASSMENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
                {
                  category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
                  threshold: 'BLOCK_ONLY_HIGH',
                },
              ],
            },
        });

        const candidate = candidates[0];
        
        // Eğer model güvenlik nedeniyle durduysa (yeni, daha az katı kurallarımıza göre), 
        // resim güvenli değildir.
        if (candidate.finishReason === FinishReason.Safety) {
             return { isSafe: false, reason: "Resim, topluluk kurallarını ihlal ediyor." };
        }
        
        // Aksi takdirde, resim güvenlidir.
        return { isSafe: true, reason: "Güvenli" };

    } catch (error: any) {
        // Genkit, ciddi güvenlik ihlallerinde doğrudan bir hata fırlatabilir.
         if (error.message.includes('SAFETY')) {
             return { isSafe: false, reason: "Resim, topluluk kurallarını ihlal ediyor." };
        }
        // Diğer beklenmedik hataları yeniden fırlat.
        console.error("Moderation flow error:", error);
        throw new Error("Görüntü denetlenirken beklenmedik bir hata oluştu.");
    }
  }
);
