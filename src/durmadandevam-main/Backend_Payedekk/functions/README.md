# Anlık Bildirimleri Aktif Etme Rehberi

Uygulamanızın, kapalıyken bile kullanıcılara anlık bildirim (push notification) gönderebilmesi için sunucu tarafında küçük bir kurulum gereklidir. Bu işlem için terminal kullanmanız gerekecek, ancak adımları olabildiğince basitleştirdik.

## Neden Bu Gerekli?

Bildirim gönderme işlemi, güvenli bir sunucu ortamından yapılmalıdır. `firebase-functions`, bu iş için harika bir çözümdür ve projenize bu özelliği eklemek için aşağıdaki adımları izlemeniz yeterlidir.

---

### Adım 1: Firebase CLI Kurulumu (Eğer Yüklü Değilse)

Bilgisayarınızda Firebase'in komut satırı aracı (CLI) yüklü değilse, terminali açıp şu komutu bir kereye mahsus çalıştırın:

```bash
npm install -g firebase-tools
```

### Adım 2: Firebase Hesabınıza Giriş Yapın

Yine terminalde, aşağıdaki komutla Firebase hesabınıza giriş yapın:

```bash
firebase login
```

Bu komut tarayıcınızda bir pencere açarak giriş yapmanızı isteyecektir.

### Adım 3: Fonksiyonları Dağıtın (Deploy)

Bu son adım, bildirim gönderme kodunuzu sunucuya yükleyecektir. Projenizin ana klasöründeyken terminale şu komutu yapıştırın:

```bash
firebase deploy --only functions
```

Hepsi bu kadar! Bu komut tamamlandığında, anlık bildirim sisteminiz tamamen aktif hale gelecektir.
