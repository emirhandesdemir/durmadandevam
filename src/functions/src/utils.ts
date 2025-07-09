// src/functions/src/utils.ts

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
