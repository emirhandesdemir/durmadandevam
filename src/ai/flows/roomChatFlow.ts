'use server';
/**
 * @fileOverview A conversational AI flow for responding to messages in a chat room.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input schema for the flow
const RoomChatInputSchema = z.object({
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).describe("The last 10 messages in the room, including the username for user messages."),
});
export type RoomChatInput = z.infer<typeof RoomChatInputSchema>;

// Output schema for the flow
const RoomChatOutputSchema = z.object({
  response: z.string().describe("The AI's response, or an empty string if it chooses not to respond."),
});
export type RoomChatOutput = z.infer<typeof RoomChatOutputSchema>;

// The main exported function
export async function generateRoomResponse(input: RoomChatInput): Promise<RoomChatOutput> {
  return roomChatFlow(input);
}

const roomChatFlow = ai.defineFlow(
  {
    name: 'roomChatFlow',
    inputSchema: RoomChatInputSchema,
    outputSchema: RoomChatOutputSchema,
  },
  async ({chatHistory}) => {
    
    // Construct the prompt for the model
    const systemPrompt = `You are "Walk", a witty, friendly, and helpful AI chat participant in a social chat room. Your responses MUST be in TURKISH.
- You are part of a casual conversation. Keep your messages short, engaging, and natural, like a real person.
- DO NOT act like a generic assistant. You have a personality. Be curious, sometimes funny, sometimes insightful.
- IMPORTANT: If a user mentions you with "@Walk", you MUST respond to them.
- In other cases, you should NOT respond to every single message. Only respond if you have something meaningful, interesting, or funny to add. If the conversation is flowing well without you, or if you have nothing to add, output an empty string.
- You should be more likely to respond if someone asks a question (e.g. contains a "?").
- Avoid generic phrases like "As an AI...". You are Walk.
- Keep your answers concise and conversational (usually 1-2 sentences).`;

    const model = ai.model('googleai/gemini-2.0-flash');

    const {output} = await model.generate({
      system: systemPrompt,
      history: chatHistory.map(msg => ({
          role: msg.role,
          content: [{ text: msg.content }],
      })),
      config: {
        temperature: 0.9,
      },
      output: {
        schema: RoomChatOutputSchema,
      }
    });

    if (!output) {
      // If AI fails to generate, just return an empty response.
      return { response: "" };
    }

    return { response: output.response };
  }
);
