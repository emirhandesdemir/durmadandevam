// src/ai/flows/mindWarGameFlow.ts
'use server';

/**
 * @fileOverview Zihin Savaşları oyununu yöneten yapay zeka akışları.
 *
 * - initializeMindWar: Yeni bir oyun başlatır, senaryo ve roller oluşturur.
 * - processMindWarTurn: Bir oyuncunun hamlesini işler ve hikayeyi ilerletir.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { Timestamp } from 'firebase/firestore';

// Zod şemaları, yapay zekadan alınacak ve gönderilecek verinin yapısını tanımlar.
// Bu, veri tutarlılığını ve güvenliğini sağlar.

// Oyuncu bilgilerini tanımlayan şema
const PlayerSchema = z.object({
  uid: z.string().describe('Oyuncunun benzersiz kimliği.'),
  username: z.string().describe('Oyuncunun adı.'),
  photoURL: z.string().nullable().describe('Oyuncunun profil fotoğrafı URL\'si.'),
});
type Player = z.infer<typeof PlayerSchema>;

// Oyunun başlangıç durumu için giriş şeması
const InitializeMindWarInputSchema = z.object({
  players: z.array(PlayerSchema).min(2).max(5).describe('Oyuncuların listesi.'),
  theme: z.string().min(10).describe('Oyunun ana teması veya senaryosu.'),
});

// Oyunun başlangıç durumu için çıkış şeması (AI'nin üreteceği veri)
const InitializeMindWarOutputSchema = z.object({
  status: z.literal('ongoing').describe('Oyun durumu "ongoing" olarak ayarlanmalı.'),
  theme: z.string().describe('Oyunun teması.'),
  players: z.array(z.object({
    uid: z.string(),
    username: z.string(),
    photoURL: z.string().nullable(),
    role: z.string().describe('Oyuncuya atanan gizli rol (örn: Lider, Casus, Hain, Bilim İnsanı).'),
    status: z.literal('alive').describe('Başlangıçta tüm oyuncular "alive" olmalı.'),
    objective: z.string().describe('Oyuncunun kişisel ve gizli görevi.'),
    inventory: z.array(z.string()).describe('Oyuncunun başlangıç envanteri (genellikle boş).'),
  })),
  gameHistory: z.array(z.any()).length(0).describe('Başlangıçta oyun geçmişi boş bir dizi olmalı.'),
  currentTurn: z.object({
    turnNumber: z.literal(1).describe('Başlangıç turu 1 olmalı.'),
    activePlayerUid: z.string().nullable().describe('İlk konuşmayı yapacak oyuncunun UID\'si veya anlatıcı için null.'),
    narrative: z.string().describe('Oyunu başlatan, atmosferi ve ilk durumu anlatan hikaye metni.'),
    choices: z.record(z.string()).describe('Sıradaki oyuncuya sunulacak seçenekler.'),
    outcome: z.string().optional().describe('Bu turdaki bir seçimin sonucu.'),
  }),
});

// Oyuncunun hamlesini tanımlayan şema
const PlayerMoveSchema = z.object({
  playerId: z.string(),
  choiceKey: z.string(),
  choiceText: z.string(),
});

// Bir turu işlemek için giriş şeması
const ProcessTurnInputSchema = z.object({
  currentState: z.any().describe('Oyunun mevcut tam durumu (JSON formatında).'),
  playerMove: PlayerMoveSchema.describe('Oyuncunun yaptığı son hamle.'),
});

// Bir turu işledikten sonra yapay zekanın üreteceği yeni durumun şeması
const ProcessTurnOutputSchema = z.object({
  status: z.enum(['ongoing', 'finished']).describe('Oyunun yeni durumu.'),
  players: z.array(z.any()).describe('Oyuncuların güncellenmiş listesi (örn: birisi elendi mi?).'),
  gameHistory: z.array(z.any()).describe('Eski turun eklendiği güncellenmiş oyun geçmişi.'),
  currentTurn: z.object({
    turnNumber: z.number().int().positive().describe('Yeni turun numarası.'),
    activePlayerUid: z.string().nullable().describe('Sıradaki oyuncunun UID\'si veya anlatıcı için null.'),
    narrative: z.string().describe('Oyuncunun seçiminin sonucunu ve hikayenin yeni gelişimini anlatan metin.'),
    choices: z.record(z.string()).describe('Sıradaki oyuncuya sunulacak yeni seçenekler.'),
    outcome: z.string().optional().describe('Bu turdaki bir seçimin sonucu.'),
  }).describe('Oyunun bir sonraki turu.'),
  endSummary: z.object({
    narrative: z.string().describe('Oyunun nasıl bittiğini özetleyen sonuç metni.'),
    winner: z.string().nullable().describe('Kazanan oyuncunun adı veya takım.'),
    scores: z.record(z.object({
      intelligence: z.number().int().min(0).max(100),
      trust: z.number().int().min(0).max(100),
      courage: z.number().int().min(0).max(100),
      reward: z.number().int().min(0).describe('Oyuncunun kazandığı elmas ödülü.'),
    })).describe('Her oyuncu için performans puanları.'),
  }).optional().describe('Oyun bittiyse doldurulacak sonuç özeti.'),
});

// Yeni bir oyun başlatan Genkit akışı
export const initializeMindWar = ai.defineFlow(
  {
    name: 'initializeMindWarFlow',
    inputSchema: InitializeMindWarInputSchema,
    outputSchema: InitializeMindWarOutputSchema,
  },
  async (input) => {
    const prompt = `
      You are the Game Master for a psychological role-playing game called "Zihin Savaşları".
      Your task is to create a unique, compelling, and suspenseful starting scenario.

      GAME THEME: "${input.theme}"
      PLAYERS: ${input.players.map(p => p.username).join(', ')}

      INSTRUCTIONS:
      1.  **Assign Secret Roles**: Secretly assign one unique, intriguing role to each player from a list like: "Lider", "Hain", "Casus", "Doktor", "Mühendis", "Psikolog", "Asker", "Nöbetçi". Do NOT assign the same role to multiple players.
      2.  **Create Secret Objectives**: For each player, create a secret, personal objective related to their role and the theme. For example, the traitor's objective might be to sabotage the group's efforts without being discovered.
      3.  **Write the Opening Narrative**: Write a gripping opening story that sets the scene, introduces the conflict, and presents the initial situation. The narrative must be in TURKISH.
      4.  **Determine the First Actor**: Decide who makes the first move. This can be a specific player or a group decision (represented by making the `activePlayerUid` null and presenting choices to the group).
      5.  **Create First Choices**: Based on the narrative, create 2 to 4 compelling choices for the first actor.

      Your entire response MUST be in the specified JSON format.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      output: { format: 'json', schema: InitializeMindWarOutputSchema },
      config: { temperature: 1.1 },
    });

    if (!output) throw new Error("Yapay zeka oyun başlangıç durumu oluşturamadı.");
    return { ...output, theme: input.theme };
  }
);

// Oyuncunun hamlesini işleyen ve bir sonraki turu oluşturan Genkit akışı
export const processMindWarTurn = ai.defineFlow(
  {
    name: 'processMindWarTurnFlow',
    inputSchema: ProcessTurnInputSchema,
    outputSchema: ProcessTurnOutputSchema,
  },
  async ({ currentState, playerMove }) => {
    // Önceki turu mevcut tur bilgisi ve oyuncu seçimi ile tamamla
    const previousTurn = {
      ...currentState.currentTurn,
      playerChoice: {
        uid: playerMove.playerId,
        choiceKey: playerMove.choiceKey,
        choiceText: playerMove.choiceText,
      },
      timestamp: Timestamp.now(), // Turu bitirirken zaman damgasını ekle
    };

    const prompt = `
      You are the Game Master for "Zihin Savaşları". Continue the story based on the player's last move.

      GAME STATE (JSON):
      ${JSON.stringify(currentState, null, 2)}

      PLAYER'S LAST MOVE:
      - Player: "${playerMove.playerId}"
      - Choice: "${playerMove.choiceKey}: ${playerMove.choiceText}"

      INSTRUCTIONS:
      1.  **Narrate the Outcome**: Write a narrative in TURKISH describing the immediate consequences of the player's choice. How do other characters react? Does the environment change? Does it advance anyone's secret objective?
      2.  **Update Player Status**: Based on the outcome, decide if any player's status changes (e.g., a player is eliminated). Update the 'players' array accordingly.
      3.  **Check for End-Game Conditions**: Has the main objective been met? Is there only one player left? If so, set 'status' to 'finished'.
      4.  **Determine Next Turn**: Decide who acts next. It could be another player or a general event. Update 'activePlayerUid'.
      5.  **Create New Choices**: Create 2-4 new, meaningful choices for the next active player.
      6.  **If the game is finished**:
          - Write a concluding narrative for the 'endSummary'.
          - Assign a winner (player's username or a team name like "Survivors").
          - Analyze the entire 'gameHistory' and provide scores (0-100) for each player in Intelligence, Trust, and Courage. Be fair and base it on their actions.
          - Assign a diamond reward (between 10 and 100) to each player based on their performance and role-playing.

      Your entire response MUST be in the specified JSON format.
    `;

    const { output } = await ai.generate({
      prompt: prompt,
      output: { format: 'json', schema: ProcessTurnOutputSchema },
      config: { temperature: 0.9 },
    });

    if (!output) throw new Error("Yapay zeka yeni tur durumu oluşturamadı.");
    
    // Yeni oyun geçmişini oluştur
    const newGameHistory = [...currentState.gameHistory, previousTurn];
    
    return { ...output, gameHistory: newGameHistory };
  }
);
