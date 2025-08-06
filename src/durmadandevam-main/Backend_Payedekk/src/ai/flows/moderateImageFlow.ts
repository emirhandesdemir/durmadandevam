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
import {Candidate, FinishReason} from '@genkit-ai/ai';

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
            // Use default safety settings, which are reasonably strict
        });

        const candidate = candidates[0];
        
        // Check if the model stopped due to safety reasons.
        if (candidate.finishReason === FinishReason.Safety) {
            const explicitRating = candidate.safetyRatings?.find(
                (r) => r.category === 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
            );
            // Even if the reason is safety, double-check the specific category
            if (explicitRating) {
                return { isSafe: false, reason: "Resim, müstehcen içerik politikalarını ihlal ediyor." };
            }
        }
        
        // Also check the ratings directly, as some content might be borderline
        const explicitRating = candidate.safetyRatings?.find(
            (r) => r.category === 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
        );
        
        // SEVERITY_NEGLIGIBLE, SEVERITY_LOW, SEVERITY_MEDIUM, SEVERITY_HIGH
        if (explicitRating && (explicitRating.severity === 'MEDIUM' || explicitRating.severity === 'HIGH')) {
            return { isSafe: false, reason: "Resim, müstehcen içeriğe sahip olabilir." };
        }
        
        return { isSafe: true, reason: "Güvenli" };

    } catch (error: any) {
        // Genkit might throw a top-level error for severe safety violations before returning a candidate
         if (error.message.includes('SAFETY')) {
             return { isSafe: false, reason: "Resim, müstehcen içerik politikalarını ihlal ediyor." };
        }
        // Rethrow other unexpected errors
        console.error("Moderation flow error:", error);
        throw new Error("Görüntü denetlenirken beklenmedik bir hata oluştu.");
    }
  }
);
