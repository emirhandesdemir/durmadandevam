# Firestore Veritabanı İndeksleri

Bu dosya, uygulamanın düzgün çalışması için Firestore veritabanınızda oluşturulması gereken birleşik indeksleri listeler. Birleşik indeksler, birden fazla alana göre filtreleme ve sıralama yapan sorgular için gereklidir.

## İndeksler Nasıl Oluşturulur?

Firestore, bir sorgu için indeks gerektiğinde genellikle konsol çıktısında doğrudan bir link oluşturur. Bu linke tıklayarak indeksi kolayca oluşturabilirsiniz. Aşağıda, uygulama için gerekli olan ve hata mesajlarında karşılaşabileceğiniz indekslerin listesi ve oluşturma linkleri bulunmaktadır.

---

### 1. Profil Gönderileri İndeksi

- **Amaç:** Bir kullanıcının profil sayfasındaki gönderileri en yeniden eskiye doğru sıralamak.
- **Koleksiyon:** `posts`
- **Alanlar:**
    1. `uid` (Artan)
    2. `createdAt` (Azalan)
- **Oluşturma Linki:**
  ```
  https://console.firebase.google.com/v1/r/project/yenidendeneme-ea9ed/firestore/indexes?create_composite=ClFwcm9qZWN0cy95ZW5pZGVuZGVuZW1lLWVhOWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9wb3N0cy9pbmRleGVzL18QARoHCgN1aWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
  ```

### 2. Sohbet Listesi İndeksi

- **Amaç:** Kullanıcının dahil olduğu sohbetleri son mesaja göre sıralamak.
- **Koleksiyon:** `directMessagesMetadata`
- **Alanlar:**
    1. `participantUids` (Dizi İçerir)
    2. `lastMessage.timestamp` (Azalan)
- **Oluşturma Linki:**
  ```
  https://console.firebase.google.com/v1/r/project/yenidendeneme-ea9ed/firestore/indexes?create_composite=Cnxwcm9qZWN0cy95ZW5pZGVuZGVuZW1lLWVhOWVkL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9kaXJlY3RNZXNzYWdlc01ldGFkYXRhL2luZGV4ZXMvXxABChEKDXBhcnRpY2lwYW50VWlkcxACGhoKFmxhc3RNZXNzYWdlLnRpbWVzdGFtcBADGgwKCF9fbmFtZV9fEAI
  ```
  
### 3. AFK Kullanıcı Sorgusu İndeksi

- **Amaç:** Sesli odalarda belirli bir süredir aktif olmayan kullanıcıları bulmak.
- **Koleksiyon (Alt Koleksiyon):** `voiceParticipants`
- **Alanlar:**
    1. `lastActiveAt` (Artan)
- **Not:** Bu tek alanlı bir indekstir ve genellikle Firestore tarafından otomatik olarak yönetilir. Ancak bir hata alırsanız, `voiceParticipants` alt koleksiyonu için `lastActiveAt` alanına artan sırada bir indeks oluşturmanız gerekebilir.

Bu indeksleri projenizin ilk kurulum aşamasında oluşturmak, gelecekte karşılaşabileceğiniz sorgu hatalarını önleyecektir.
