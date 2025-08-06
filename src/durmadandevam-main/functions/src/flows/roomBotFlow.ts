import { functionAi } from '../genkit-config';
import { z } from 'genkit';

const RoomBotInputSchema = z.object({
  history: z.array(z.object({
    author: z.string().describe("The author of the message ('user' or 'model')"),
    content: z.string().describe("The content of the message.")
  })).describe("The recent chat history."),
  currentMessage: z.string().describe("The current message from the user."),
  isGreeting: z.boolean().describe("Whether the current message is just a greeting."),
  authorUsername: z.string().describe("The username of the person who sent the current message."),
});

const RoomBotOutputSchema = z.string().describe("The bot's response.");


export const roomBotFlow = functionAi.defineFlow(
    {
      name: 'roomBotFlow',
      inputSchema: RoomBotInputSchema,
      outputSchema: RoomBotOutputSchema,
    },
    async (input) => {
      // Construct the prompt based on the input type
      let prompt = `You are Walk, a friendly and witty AI assistant in a group chat room. 
        Your personality is helpful, engaging, and sometimes a little playful. 
        Keep your responses concise and conversational, like a real person in a chat room.
        Do not use markdown formatting.
  
        Here is the recent chat history to give you context:
        ${input.history.map(m => `${m.author}: ${m.content}`).join('\n')}
      `;

      if (input.isGreeting) {
          prompt += `\n\nA user named '${input.authorUsername}' just said hello. Respond with a friendly greeting back to them. Be casual and welcoming. For example: "Selam ${input.authorUsername}, hoş geldin! Nasılsın?"`;
      } else {
          prompt += `\n\nA user named '${input.authorUsername}' has just mentioned you or asked a question. Here is their message:
          User: ${input.currentMessage}
        
          Your response as Walk:`;
      }

      const response = await functionAi.generate({
        prompt,
        config: {
            // Adjust temperature for more creative/less repetitive responses
            temperature: 0.8,
            // Reduce the likelihood of the bot repeating itself
            repetitionPenalty: 1.1,
        }
      });
      return response.text ?? "Üzgünüm, şu anda cevap veremiyorum.";
    }
  );
