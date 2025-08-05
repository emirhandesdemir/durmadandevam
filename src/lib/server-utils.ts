// src/lib/server-utils.ts

// Bu dosya, sunucu tarafında kullanılan yardımcı fonksiyonları içerir.
import { Timestamp, collection, getDocs, query, where, limit } from 'firebase/firestore';
import { db } from './firebase';
import type { UserProfile } from './types';


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
  if (typeof obj.seconds === 'number' && typeof obj.nanoseconds === 'number') {
    try {
       return new Timestamp(obj.seconds, obj.nanoseconds).toDate().toISOString();
    } catch(e) {
      // Fallback if it's not a valid timestamp structure
      return obj;
    }
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

/**
 * Kullanıcı adına göre bir kullanıcıyı bulur.
 * Bu fonksiyon, sunucu tarafında çalışmalıdır.
 * @param username Aranacak kullanıcı adı.
 * @returns UserProfile nesnesi veya null.
 */
export async function findUserByUsername(username: string): Promise<UserProfile | null> {
    if (!username) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username_lowercase', '==', username.toLowerCase()), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    return deepSerialize({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
}

/**
 * Finds a user by their numeric unique tag.
 * This should be used for resolving profile page URLs.
 * @param uniqueTag The numeric tag to search for.
 * @returns UserProfile object or null.
 */
export async function findUserByUniqueTag(uniqueTag: number): Promise<UserProfile | null> {
    if (!uniqueTag || isNaN(uniqueTag)) return null;
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('uniqueTag', '==', uniqueTag), limit(1));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
        return null;
    }

    const userDoc = querySnapshot.docs[0];
    return deepSerialize({ uid: userDoc.id, ...userDoc.data() } as UserProfile);
}
