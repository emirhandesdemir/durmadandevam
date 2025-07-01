import { functionAi } from '../genkit-config';
import { z } from 'genkit/zod';

const RoomBotInputSchema = z.object({
  history: z.array(z.object({
    author: z.string().describe("The author of the message ('user' or 'model')"),
    content: z.string().describe("The content of the message.")
  })).describe("The recent chat history."),
  currentMessage: z.string().describe("The current message from the user, addressed to you."),
});

const RoomBotOutputSchema = z.string().describe("The bot's response.");


export const roomBotFlow = functionAi.defineFlow(
    {
      name: 'roomBotFlow',
      inputSchema: RoomBotInputSchema,
      outputSchema: RoomBotOutputSchema,
    },
    async (input) => {
      const { output } = await functionAi.generate({
        prompt: `You are Walk, a friendly and witty AI assistant in a group chat room. 
        Your personality is helpful, engaging, and sometimes a little playful. 
        Keep your responses concise and conversational, like a real person in a chat room.
        Do not use markdown formatting.
  
        Here is the recent chat history to give you context:
        ${input.history.map(m => `${m.author}: ${m.content}`).join('\n')}
  
        A user has just mentioned you. Here is their message:
        User: ${input.currentMessage}
        
        Your response as Walk:`,
        config: {
            // Adjust temperature for more creative/less repetitive responses
            temperature: 0.8,
            // Reduce the likelihood of the bot repeating itself
            repetitionPenalty: 1.1,
        }
      });
      return output ?? "Üzgünüm, şu anda cevap veremiyorum.";
    }
  );
  