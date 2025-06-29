# PWA'nızı Google Play Store'a Yükleme Rehberi

Tebrikler! Uygulamanızın teknik altyapısı artık Google Play Store'a gönderilmeye hazır. PWA'nızı bir Android uygulamasına dönüştürmek ve yayınlamak için aşağıdaki adımları takip edebilirsiniz.

## Ön Hazırlıklar

Bu rehber, aşağıdaki araçları kullanacağınızı varsayar:
- **Google Play Console:** Android uygulamalarını yayınlamak için Google'ın resmi platformu. Bir geliştirici hesabı gereklidir.
- **PWA Builder:** Web sitenizi (PWA) uygulama paketlerine dönüştüren, Microsoft tarafından geliştirilmiş açık kaynaklı bir araçtır.

---

### Adım 1: Gerekli Görsel Varlıkların Oluşturulması

Play Store, uygulamanızın farklı yerlerde gösterilmesi için çeşitli boyutlarda ikonlara ve ekran görüntülerine ihtiyaç duyar.

#### a) Uygulama İkonları

Projenizde `public/icons/` klasörü altına aşağıdaki PNG formatında ikonları oluşturup yerleştirmeniz gerekmektedir:

- `icon-192x192.png`: 192x192 piksel boyutunda.
- `icon-512x512.png`: 512x512 piksel boyutunda.

Temel olarak kullanabileceğiniz `icon-512x512.svg` dosyası klasörde mevcuttur. Bu SVG dosyasını kullanarak gerekli PNG'leri kolayca oluşturabilirsiniz.

#### b) Ekran Görüntüleri

Play Store'da uygulamanızın nasıl göründüğünü göstermek için ekran görüntüleri sağlamalısınız.

1. Uygulamanızın en güzel görünen sayfalarının (örn: Ana Akış, Sohbet Odası, Profil) mobil cihazda ekran görüntülerini alın.
2. Bu ekran görüntülerini `public/screenshots/` adında yeni bir klasör oluşturup içine kaydedin (örn: `screenshot1.png`, `screenshot2.png`).
3. `public/manifest.json` dosyasını açın ve `screenshots` bölümündeki placeholder (yer tutucu) bilgileri kendi ekran görüntülerinizle güncelleyin.

**Örnek `manifest.json` güncellemesi:**
```json
"screenshots": [
  {
    "src": "/screenshots/ana-akis.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "Ana Akış"
  },
  {
    "src": "/screenshots/oda.png",
    "sizes": "1080x1920",
    "type": "image/png",
    "form_factor": "narrow",
    "label": "Sohbet Odası"
  }
]
```

---

### Adım 2: Digital Asset Links'in Yapılandırılması

Bu adım, Google Play'in PWA'nızın web sitesiyle aynı geliştiriciye ait olduğunu doğrulaması için **kritik öneme sahiptir**.

1. **Google Play Console'a gidin:** Uygulamanızı oluşturun ve "Uygulama Bütünlüğü" (App Integrity) sayfasına gidin.
2. **SHA-256 Sertifika Parmak İzini (SHA-256 certificate fingerprint) kopyalayın.**
3. **Uygulamanızın paket adını (package name) öğrenin.** Bu, genellikle `com.sirketiniz.uygulamaniz` formatındadır ve PWA Builder gibi araçlar kullanırken belirlenir.
4. Projenizdeki `public/.well-known/assetlinks.json` dosyasını açın.
5. `package_name` ve `sha256_cert_fingerprints` alanlarını kendi bilgilerinizle güncelleyin.

**Örnek `assetlinks.json` güncellemesi:**
```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "tr.com.hiwewalk.app",
    "sha256_cert_fingerprints":
    ["Sizin_Google_Play_den_Aldiginiz_SHA256_Parmak_Izi_Buraya_Gelecek"]
  }
}]
```

---

### Adım 3: PWA'yı Paketleme ve Yükleme

Web uygulamanızı Play Store'a yüklenecek bir `.aab` (Android App Bundle) dosyasına dönüştürmek için en kolay yol **PWA Builder**'dır.

1. **[pwabuilder.com](https://pwabuilder.com/)** adresine gidin.
2. Uygulamanızın yayınlanmış URL'sini girin ve "Start" butonuna tıklayın.
3. PWA Builder, `manifest.json` dosyanızı analiz edecek ve uygulamanızın mağazaya ne kadar hazır olduğunu gösteren bir puan verecektir.
4. "Package for Stores" veya benzeri bir seçeneği takip ederek "Android" platformunu seçin.
5. PWA Builder, size uygulamanızı paketlemek için gerekli talimatları verecek ve indirilmeye hazır bir `.aab` dosyası oluşturacaktır.
6. Oluşturulan bu `.aab` dosyasını **Google Play Console** üzerinden uygulamanızın yeni bir sürümü olarak yükleyin.

Bu adımları tamamladıktan sonra, Google'ın inceleme sürecini takip ederek uygulamanızı Google Play Store'da yayınlayabilirsiniz!
