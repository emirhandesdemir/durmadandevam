// Bu dosya, proje genelinde kullanılan genel yardımcı fonksiyonları içerir.
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS sınıflarını birleştirmek ve çakışmaları önlemek için kullanılır.
 * Örn: `cn('p-4', 'p-2')` çağrısı, `p-2` sonucunu verir.
 * @param inputs Birleştirilecek CSS sınıfları.
 * @returns Optimize edilmiş CSS sınıf string'i.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * İki kullanıcı ID'sinden her zaman tutarlı bir sohbet ID'si oluşturur.
 * ID'leri alfabetik olarak sıralayarak, `getChatId(uid1, uid2)` ve `getChatId(uid2, uid1)`
 * çağrılarının her zaman aynı sonucu (`uid1_uid2` gibi) vermesini sağlar.
 * Bu, iki kullanıcı arasında sadece tek bir sohbet odası olmasını garantiler.
 * @param uid1 Birinci kullanıcının ID'si.
 * @param uid2 İkinci kullanıcının ID'si.
 * @returns Alfabetik olarak sıralanmış ve birleştirilmiş sohbet ID'si.
 */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

/**
 * Converts a single emoji character into a Data URL for use as an image source.
 * This function now explicitly runs only on the client-side to prevent hydration errors.
 * @param emoji The emoji character to convert.
 * @returns A data URL string representing the emoji as an SVG image, or an empty string if not on the client.
 */
export function emojiToDataUrl(emoji: string): string {
  if (typeof window === 'undefined') {
    // Return a placeholder or empty string during server-side rendering
    return '';
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <text x="50%" y="50%" font-size="96" text-anchor="middle" dy=".3em">${emoji}</text>
    </svg>
  `.trim();
  
  // Now we can safely use btoa as we've confirmed we're on the client
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
