import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// Genkit'i Cloud Functions ortamı için yapılandır.
export const functionAi = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
