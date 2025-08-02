// src/lib/server-utils.ts

// Bu dosya, sunucu tarafında kullanılan yardımcı fonksiyonları içerir.
import { Timestamp } from 'firebase/firestore';


/**
 * Firestore'dan gelen ve `Timestamp` gibi serileştirilemeyen nesneler içeren
 * bir objeyi, istemci bileşenlerine (client components) prop olarak güvenle
 * aktarılabilen düz (plain) bir JSON nesnesine dönüştürür.
 * Next.js'te sunucu ve istemci arasında veri aktarımı için bu gereklidir.
 * @param obj Dönüştürülecek nesne veya değer.
 * @returns JSON uyumlu, serileştirilebilir yeni bir nesne.
 */
export function deepSerialize(obj: any): any {
  // Eğer değer null veya primitive bir tür ise (nesne değilse), doğrudan döndür.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Firestore Timestamp nesnesini kontrol et ve ISO 8601 formatında bir string'e çevir.
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
  
  // Bazen Timestamp'lar `toJSON` ile `{seconds, nanoseconds}` yapısındaki
  // düz objelere dönüşebilir. Bu durumu da yakala ve string'e çevir.
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new Timestamp(obj.seconds, obj.nanoseconds).toDate().toISOString();
  }
  
  // Eğer bir dizi (array) ise, her elemanını özyineli (recursive) olarak işle.
  if (Array.isArray(obj)) {
    return obj.map(item => deepSerialize(item));
  }

  // Eğer bir nesne ise, her bir anahtar-değer çiftini özyineli olarak işle.
  const newObj: { [key: string]: any } = {};
  for (const key in obj) {
    // Nesnenin kendi özelliğiyse devam et (prototip zincirindeki özellikleri alma).
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      newObj[key] = deepSerialize(obj[key]);
    }
  }

  return newObj;
}
