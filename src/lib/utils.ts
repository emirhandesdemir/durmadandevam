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
 * Bir emojiyi data URI formatında bir SVG'ye dönüştürür.
 * Bu, avatarlar için varsayılan bir görsel sağlamak amacıyla kullanılır.
 * @param emoji - SVG'ye dönüştürülecek emoji.
 * @returns Data URI formatında bir SVG string'i.
 */
export const emojiToDataUrl = (emoji: string) => {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
        <rect width="100" height="100" fill="hsl(220 9% 46% / 0.1)" />
        <text x="50%" y="50%" font-size="80" text-anchor="middle" dominant-baseline="central">${emoji}</text>
      </svg>
    `.replace(/\n/g, "").replace(/\s+/g, " ");
    return `data:image/svg+xml;base64,${btoa(svg)}`;
};
