// src/lib/server-utils.ts
import { Timestamp } from 'firebase/firestore';

/**
 * Firestore'dan gelen ve `Timestamp` gibi serileştirilemeyen nesneler içeren
 * bir objeyi, istemci bileşenlerine güvenle aktarılabilen düz (plain) bir
 * JSON nesnesine dönüştürür.
 * @param obj Dönüştürülecek nesne veya değer.
 * @returns JSON uyumlu, serileştirilebilir yeni bir nesne.
 */
export function deepSerialize(obj: any): any {
  // Eğer değer null veya primitive bir tür ise (nesne değilse), doğrudan döndür.
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Firestore Timestamp nesnesini kontrol et ve ISO string'e çevir.
  if (obj instanceof Timestamp) {
    return obj.toDate().toISOString();
  }
  
  // Bazen Timestamp'lar `toJSON` ile düz objelere dönüşebilir. 
  // Bu `{seconds, nanoseconds}` yapısındaki nesneleri de yakala.
  if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
    return new Timestamp(obj.seconds, obj.nanoseconds).toDate().toISOString();
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
