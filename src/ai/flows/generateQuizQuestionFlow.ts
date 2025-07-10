'use server';
/**
 * @fileOverview Rastgele ve eğlenceli quiz soruları üreten bir Genkit akışı.
 *
 * - generateQuizQuestions - İnternetten üç trivia sorusu, her biri için 4 seçenek ve doğru cevabı alır.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { QuizQuestion } from '@/lib/types';


// Define the Zod schema for a single quiz question internally
const QuizQuestionSchema = z.object({
  question: z.string().describe("The trivia question in Turkish."),
  options: z.array(z.string()).length(4).describe("An array of four possible answers in Turkish."),
  correctOptionIndex: z.number().min(0).max(3).describe("The zero-based index of the correct answer in the options array."),
});

// The flow's output will be an array of three questions
const QuizQuestionArraySchema = z.array(QuizQuestionSchema).length(3);

// Type for the array of questions
type QuizQuestionArrayOutput = z.infer<typeof QuizQuestionArraySchema>;


// The main exported async function
export async function generateQuizQuestions(): Promise<QuizQuestionArrayOutput> {
  return generateQuizQuestionFlow({});
}

// Genkit flow definition
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
        temperature: 1.2, // Increase temperature for more creative and varied questions
      },
    });
    
    if (!output) {
      throw new Error("AI'dan soru üretilemedi.");
    }
    return output;
  }
);
