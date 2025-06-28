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
  // 1. Temel Durum: Değer bir nesne değilse (null dahil), olduğu gibi döndür.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // 2. Timestamp Kontrolü: Firestore Timestamp nesnesi ise, ISO string'e çevir.
  // Bu kontrol hem gerçek `Timestamp` örneklerini hem de `toDate` metoduna sahip
  // benzer yapıları (duck typing) yakalar.
  if (typeof obj.toDate === 'function') {
    return obj.toDate().toISOString();
  }

  // 3. Dizi Kontrolü: Eğer bir dizi ise, her elemanı için fonksiyonu tekrar çağır.
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }

  // 4. Nesne Kontrolü: Kalan durum bir nesne olmalıdır. Her bir anahtar-değer
  //    çifti için fonksiyonu tekrar çağırarak yeni bir nesne oluştur.
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    // Nesnenin prototip zincirinden gelen özellikleri atlamak için kontrol.
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepSerialize(obj[key]);
    }
  }

  return newObj;
}
