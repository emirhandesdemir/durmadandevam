// Bu dosya, Genkit kütüphanesini yapılandırır ve başlatır.
// Proje genelinde kullanılacak olan AI (yapay zeka) modelini
// ve eklentileri burada tanımlarız.
import {genkit} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Google AI eklentisini kullanarak Genkit'i yapılandır.
// Varsayılan model olarak 'gemini-2.0-flash' belirlenmiştir.
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.0-flash',
});
