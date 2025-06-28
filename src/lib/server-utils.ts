// src/lib/server-utils.ts

import { Timestamp } from 'firebase/firestore';

/**
 * Veritabanından gelen ve Firestore Timestamp gibi özel nesneler içeren
 * bir objeyi, Next.js'in sunucudan istemciye güvenle aktarabileceği
 * "düz" bir objeye dönüştürür.
 * @param obj - Dönüştürülecek nesne veya dizi.
 * @returns JSON uyumlu, serileştirilebilir yeni bir nesne.
 */
export function deepSerialize(obj: any): any {
  // Eğer değer null veya primitive bir tür ise (nesne değilse), doğrudan döndür.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Firestore Timestamp nesnesini kontrol et ve ISO string'e çevir.
  // Bu, hem `instanceof Timestamp` olanları hem de `{seconds, nanoseconds}`
  // yapısındaki düz objeleri yakalar.
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  // Dizi ise, her elemanını özyineli olarak işle.
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }

  // Nesne ise, her bir anahtar-değer çiftini özyineli olarak işle.
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    // Nesnenin kendi özelliğiyse devam et.
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepSerialize(obj[key]);
    }
  }

  return newObj;
}
