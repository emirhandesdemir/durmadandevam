# Web Uygulamanızı Android (APK) Paketine Dönüştürme Rehberi

## Giriş: Modern Yaklaşım - PWA'dan APK'ya

Merhaba! Bu rehber, modern web uygulamanızı Google Play Store'da yayınlanabilecek bir Android (APK) paketine nasıl dönüştüreceğinizi, hiç bilmeyen birinin bile anlayabileceği şekilde adım adım anlatacaktır.

Artık web uygulamalarını sıfırdan bir Android uygulaması gibi kodlamak yerine, mevcut web sitenizi akıllı bir şekilde "paketleyen" teknolojiler kullanıyoruz. Bu yönteme **TWA (Trusted Web Activity)** denir. TWA, uygulamanızın Play Store'da listelenmesini, bildirim göndermesini ve tam ekran çalışarak gerçek bir uygulama hissi vermesini sağlar.

Bu yöntem hem çok daha hızlıdır hem de mevcut kodunuzu kullanır.

---

## Gerekli Araçlar

Başlamadan önce bilgisayarınızda şu araçların kurulu olduğundan emin olun:
1.  **Node.js:** Projeyi geliştirmek için zaten kullanıyorsunuz.
2.  **Android Studio:** Google'ın resmi Android geliştirme ortamı. [Buradan](https://developer.android.com/studio) indirebilirsiniz. Bu, uygulamanızı imzalamak için gereken anahtarı (keystore) oluşturmak için gereklidir.
3.  **Bubblewrap CLI:** Google tarafından geliştirilen ve web uygulamanızı TWA paketine dönüştüren harika bir komut satırı aracı.

---

## Adım 1: Bubblewrap Kurulumu

Terminali (veya Komut İstemi'ni) açın ve aşağıdaki komutu çalıştırarak Bubblewrap'ı bilgisayarınıza kurun:

```bash
npm install -g @bubblewrap/cli
```

---

## Adım 2: İmza Anahtarı (Keystore) Oluşturma

Google Play Store, uygulamaların güvenli ve size ait olduğunu doğrulamak için bir imza anahtarı ister.

1.  **Android Studio'yu açın.** Herhangi bir proje açmanıza gerek yok.
2.  Üst menüden **Build > Generate Signed Bundle / APK...** seçeneğine tıklayın.
3.  **APK**'yı seçin ve "Next" deyin.
4.  "Key store path" alanının altındaki **"Create new..."** butonuna tıklayın.
5.  Açılan pencerede:
    *   **Key store path:** Anahtarın nereye kaydedileceğini seçin. Proje klasörünüzde `my-release-key.keystore` gibi bir isimle kaydedebilirsiniz.
    *   **Password:** Güçlü bir şifre belirleyin ve unutmamak için not alın.
    *   **Alias:** Anahtar için bir takma ad girin (örn: `my-key-alias`).
    *   **Password:** (Alias için) Yine aynı veya farklı bir şifre belirleyin.
    *   **Certificate:** Diğer alanları (İsim, Organizasyon vb.) doldurun.
    *   **OK**'a tıklayarak anahtarı oluşturun.
6.  Artık bir imza anahtarınız var. Android Studio'yu kapatabilirsiniz.

---

## Adım 3: Projeyi Hazırlama (`init`)

**ÇOK ÖNEMLİ:** `build` komutunu çalıştırmadan önce, projenizi Android için hazırlamanız gerekir. Bu `init` (başlatma) işlemi, gerekli Android proje dosyalarını oluşturur.

1.  Terminalde, projenizin ana dizinine gidin (yani `package.json` dosyasının olduğu yere).
2.  Aşağıdaki `init` komutunu çalıştırın:
    ```bash
    bubblewrap init --manifest https://hiwewalkbeta.netlify.app/manifest.json
    ```
3.  Bubblewrap size bir dizi soru soracaktır. Genellikle varsayılan değerler (`Enter` tuşuna basarak geçmek) yeterlidir, ancak şunlara dikkat edin:
    *   **Application name?** Uygulamanızın adı (örn: HiweWalk).
    *   **Package ID?** Uygulamanız için benzersiz bir kimlik (örn: `com.hiwewalk.app`).
    *   **Location of the Digital Asset Links file...** Bu dosya henüz yok, `Enter`'a basarak geçin. Sonraki adımda oluşturacağız.
    *   **Signing key path?** 2. Adımda oluşturduğunuz `my-release-key.keystore` dosyasının yolunu girin.
    *   **Key alias?** `my-key-alias` olarak belirlediğiniz takma adı girin.
    *   Sizden **şifrelerinizi** girmeniz istenecektir.

`init` işlemi tamamlandığında, projenizde Android projesi için gerekli dosyalar (`twa-manifest.json` vb.) oluşturulmuş olacaktır.

---

## Adım 4: APK'yı Oluşturma (`build`)

Hazırlık adımı tamamlandığına göre, artık APK dosyasını oluşturabilirsiniz.

1.  Terminalde, yine projenizin ana dizininde olduğunuzdan emin olun.
2.  Aşağıdaki `build` komutunu çalıştırın:
    ```bash
    bubblewrap build
    ```
3.  İşlem başarılı olursa, projenizin ana dizininde `app-release-signed.apk` adında bir dosya bulacaksınız. Tebrikler! İşte bu sizin APK dosyanız.


---

## Adım 5: Domain Doğrulama (Son ve Önemli Adım)

Google'ın, web sitenizin gerçekten size ait olduğundan emin olması gerekir. Bu adım, uygulama içindeki üst Chrome barının kalkmasını sağlar.

1.  `bubblewrap build` komutundan sonra, terminal size `assetlinks.json` adında bir dosyanın içeriğini gösterecektir. Buna benzer bir yapısı vardır:

    ```json
    [{
      "relation": ["delegate_permission/common.handle_all_urls"],
      "target": {
        "namespace": "android_app",
        "package_name": "com.hiwewalk.app",
        "sha256_cert_fingerprints":
        ["XX:XX:XX..."]
      }
    }]
    ```

2.  Bu içeriği kopyalayın.
3.  Projenizdeki `public/.well-known` klasörünün içindeki `assetlinks.json` dosyasını açın ve kopyaladığınız içeriği bu dosyaya yapıştırın.
4.  **Çok Önemli:** Bu değişikliği yaptıktan sonra projenizi tekrar yayınlamanız (deploy etmeniz) gerekir. Böylece `https://hiwewalkbeta.netlify.app/.well-known/assetlinks.json` adresi erişilebilir olur.

Bu son adımdan sonra APK dosyanız, URL çubuğu olmadan tam ekran bir şekilde çalışacaktır. Artık bu APK dosyasını test edebilir veya Google Play Console'a yükleyerek yayınlayabilirsiniz!

