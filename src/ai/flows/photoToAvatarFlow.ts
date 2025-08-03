'use server';
/**
 * @fileOverview Transforms a user's photo into a stylized avatar using AI.
 *
 * - photoToAvatar: Takes a user's photo and applies an artistic style.
 * - PhotoToAvatarInput: The input schema for the photoToAvatar flow.
 * - PhotoToAvatarOutput: The output schema for the photoToAvatar flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

export const PhotoToAvatarInputSchema = z.object({
  photoDataUri: z.string().describe("The user's photo as a data URI, expected format: 'data:<mimetype>;base64,<encoded_data>'."),
});
export type PhotoToAvatarInput = z.infer<typeof PhotoToAvatarInputSchema>;

export const PhotoToAvatarOutputSchema = z.object({
  photoDataUri: z.string().describe("The generated avatar image as a data URI: 'data:image/png;base64,...'"),
});
export type PhotoToAvatarOutput = z.infer<typeof PhotoToAvatarOutputSchema>;

export async function photoToAvatar(input: PhotoToAvatarInput): Promise<PhotoToAvatarOutput> {
  return photoToAvatarFlow(input);
}

const photoToAvatarFlow = ai.defineFlow(
  {
    name: 'photoToAvatarFlow',
    inputSchema: PhotoToAvatarInputSchema,
    outputSchema: PhotoToAvatarOutputSchema,
  },
  async ({ photoDataUri }) => {
    const prompt = `Transform the person in this photo into a stylized, artistic digital avatar.
    Retain the key facial features and essence of the person, but render them in a vibrant, slightly fantasy digital art style.
    The final image should be a high-quality profile picture, focusing on the face and shoulders, with an abstract background.`;

    try {
        const { media } = await ai.generate({
            model: 'googleai/gemini-2.0-flash-preview-image-generation',
            prompt: [
                { text: prompt },
                { media: { url: photoDataUri } }
            ],
            config: {
                responseModalities: ['IMAGE'],
            },
        });

        if (!media || !media.url) {
            throw new Error('AI did not return an image.');
        }

        return { photoDataUri: media.url };
    } catch (error: any) {
        console.error('Error transforming photo to avatar:', error);
        throw new Error('Failed to transform photo. Please try a different image.');
    }
  }
);
