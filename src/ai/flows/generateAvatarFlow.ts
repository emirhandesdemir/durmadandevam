'use server';
/**
 * @fileOverview Generates a user avatar based on a text description using AI.
 *
 * - generateAvatar: Takes a user's description and gender to create an avatar image.
 * - GenerateAvatarInput: The input schema for the generateAvatar flow.
 * - GenerateAvatarOutput: The output schema for the generateAvatar flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const GenerateAvatarInputSchema = z.object({
  description: z.string().min(5).max(200).describe('A detailed description of the desired avatar.'),
  gender: z.enum(['male', 'female', 'neutral']).default('neutral').describe('The gender to help style the avatar.'),
});
export type GenerateAvatarInput = z.infer<typeof GenerateAvatarInputSchema>;

export const GenerateAvatarOutputSchema = z.object({
  photoDataUri: z.string().describe("The generated avatar image as a data URI: 'data:image/png;base64,...'"),
});
export type GenerateAvatarOutput = z.infer<typeof GenerateAvatarOutputSchema>;

export async function generateAvatar(input: GenerateAvatarInput): Promise<GenerateAvatarOutput> {
  return generateAvatarFlow(input);
}

const generateAvatarFlow = ai.defineFlow(
  {
    name: 'generateAvatarFlow',
    inputSchema: GenerateAvatarInputSchema,
    outputSchema: GenerateAvatarOutputSchema,
  },
  async ({ description, gender }) => {
    const genderPrompt = {
        male: 'masculine, male features',
        female: 'feminine, female features',
        neutral: 'androgynous, neutral features'
    }[gender];

    const prompt = `Generate a high-quality, vibrant, and artistic digital avatar based on the following description. The avatar should be in a modern, slightly stylized, digital art style suitable for a social media profile picture. Focus on a clear portrait from the chest up.

    Description: "${description}"
    Style guidance: ${genderPrompt}, colorful, high detail, clean lines, fantasy digital art.
    The background should be a simple, abstract gradient that complements the character. The output must be a single image.`;
    
    try {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt,
            config: {
                responseModalities: ['IMAGE'],
            },
        });

        if (!media || !media.url) {
            throw new Error('AI did not return an image.');
        }

        return { photoDataUri: media.url };
    } catch (error: any) {
        console.error('Error generating avatar:', error);
        throw new Error('Failed to generate avatar. Please try a different description.');
    }
  }
);
