'use server';
/**
 * @fileOverview A chat flow for the Studio AI assistant.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the structure for a single message in the chat history
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  content: z.string(),
});

// Input schema for the flow: an array of chat messages
const StudioChatInputSchema = z.object({
  history: z.array(ChatMessageSchema),
});
export type StudioChatInput = z.infer<typeof StudioChatInputSchema>;

// Output schema: the AI's response text
const StudioChatOutputSchema = z.object({
  response: z.string().describe("The AI assistant's helpful response."),
});
export type StudioChatOutput = z.infer<typeof StudioChatOutputSchema>;


// The main exported function that the client will call
export async function studioChat(input: StudioChatInput): Promise<StudioChatOutput> {
  return studioChatFlow(input);
}

// The Genkit flow definition
const studioChatFlow = ai.defineFlow(
  {
    name: 'studioChatFlow',
    inputSchema: StudioChatInputSchema,
    outputSchema: StudioChatOutputSchema,
  },
  async ({history}) => {
    // Construct the prompt for the model
    const systemPrompt = `You are a friendly and helpful AI assistant for Firebase Studio. Your role is to understand user requests for changes to their app and explain that you are a demo. You should respond in Turkish.
If the user asks why you exist if you can't make changes, explain that you are a live demonstration of the chat UI and Genkit integration, and that the full functionality is available in the main Firebase Studio environment. Be concise and friendly.`;

    const model = ai.model('googleai/gemini-2.0-flash');

    const {output} = await model.generate({
        system: systemPrompt,
        history: history.map(msg => ({
            role: msg.role,
            content: [{ text: msg.content }],
        })),
        config: {
            temperature: 0.5,
        }
    });

    if (!output) {
      throw new Error("AI'dan yanıt alınamadı.");
    }

    return { response: output.text! };
  }
);
