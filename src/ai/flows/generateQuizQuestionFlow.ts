
'use server';
/**
 * @fileOverview Rastgele ve eğlenceli bir quiz sorusu üreten bir Genkit akışı.
 *
 * - generateQuizQuestion - İnternetten bir trivia sorusu, 4 seçenek ve doğru cevabı alır.
 * - QuizQuestionOutputSchema - Akışın dönüş tipi.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Çıkış şeması: Soru, seçenekler ve doğru cevap indeksi
const QuizQuestionOutputSchema = z.object({
  question: z.string().describe("The trivia question in Turkish."),
  options: z.array(z.string()).length(4).describe("An array of four possible answers in Turkish."),
  correctOptionIndex: z.number().min(0).max(3).describe("The zero-based index of the correct answer in the options array."),
});
export type QuizQuestionOutput = z.infer<typeof QuizQuestionOutputSchema>;

// Dışa aktarılan ana fonksiyon
export async function generateQuizQuestion(input: {}): Promise<QuizQuestionOutput> {
  return generateQuizQuestionFlow(input);
}

// Genkit akışı tanımı
const generateQuizQuestionFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionFlow',
    inputSchema: z.object({}),
    outputSchema: QuizQuestionOutputSchema,
  },
  async () => {
    const prompt = `You are a fun and witty quizmaster for a social chat app. Your task is to generate a single, interesting, and fun trivia question in TURKISH suitable for a general audience.
    The topics can be from general knowledge, science, history, pop culture, or funny facts.
    You MUST provide the question, four plausible multiple-choice options, and the zero-based index of the correct option.
    Your entire response must be in the specified JSON format.`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: {
          format: "json",
          schema: QuizQuestionOutputSchema,
      },
      config: {
        temperature: 1.2, // Daha yaratıcı ve çeşitli sorular için sıcaklığı artır
      },
    });
    
    if (!output) {
      throw new Error("AI'dan soru üretilemedi.");
    }
    return output;
  }
);
