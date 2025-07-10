'use server';
/**
 * @fileOverview Rastgele ve eğlenceli quiz soruları üreten bir Genkit akışı.
 *
 * - generateQuizQuestions - İnternetten üç trivia sorusu, her biri için 4 seçenek ve doğru cevabı alır.
 * - QuizQuestionSchema - Tek bir sorunun veri yapısı.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// Tek bir quiz sorusunun yapısını tanımlayan şema
export const QuizQuestionSchema = z.object({
  question: z.string().describe("The trivia question in Turkish."),
  options: z.array(z.string()).length(4).describe("An array of four possible answers in Turkish."),
  correctOptionIndex: z.number().min(0).max(3).describe("The zero-based index of the correct answer in the options array."),
});

// Akışın çıktısı, üç soruluk bir dizi olacak
const QuizQuestionArraySchema = z.array(QuizQuestionSchema).length(3);

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type QuizQuestionArrayOutput = z.infer<typeof QuizQuestionArraySchema>;


// Dışa aktarılan ana fonksiyon
export async function generateQuizQuestions(): Promise<QuizQuestionArrayOutput> {
  return generateQuizQuestionFlow({});
}

// Genkit akışı tanımı
const generateQuizQuestionFlow = ai.defineFlow(
  {
    name: 'generateQuizQuestionFlow',
    inputSchema: z.object({}),
    outputSchema: QuizQuestionArraySchema,
  },
  async () => {
    const prompt = `You are a fun and witty quizmaster for a social chat app. Your task is to generate THREE (3) unique, interesting, and fun trivia questions in TURKISH suitable for a general audience.
    The topics can be from general knowledge, science, history, pop culture, or funny facts.
    For each question, you MUST provide the question, four plausible multiple-choice options, and the zero-based index of the correct option.
    Your entire response must be a JSON array containing three question objects, matching the specified format.`;

    const { output } = await ai.generate({
      prompt: prompt,
      output: {
          format: "json",
          schema: QuizQuestionArraySchema,
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
