# HiweWalk Firebase Cloud Functions

Bu klasör, uygulamanız için arka plan işlemlerini yürüten (örneğin, anlık bildirim gönderme) sunucu tarafı kodlarını içerir.

## Kurulum ve Dağıtım

Bu fonksiyonları projenize dağıtmak için aşağıdaki adımları izleyin. Bu adımlar için bilgisayarınızda [Node.js](https://nodejs.org/) ve npm'in kurulu olması gerekmektedir.

### 1. Firebase CLI Kurulumu

Eğer daha önce kurmadıysanız, Firebase'in komut satırı aracını (CLI) bilgisayarınıza global olarak yükleyin:

```bash
npm install -g firebase-tools
```

### 2. Firebase'e Giriş Yapın

Aşağıdaki komutu çalıştırarak Firebase hesabınıza giriş yapın. Tarayıcınızda bir pencere açılacak ve giriş yapmanız istenecektir.

```bash
firebase login
```

### 3. Fonksiyonları Dağıtın (Deploy)

Bu adımları projenizin ana dizininde (root directory) çalıştırdığınızdan emin olun.

a. Bu `functions` klasörüne gidin:
```bash
cd functions
```

b. Gerekli Node.js paketlerini yükleyin:
```bash
npm install
```

c. Fonksiyonları Firebase projenize dağıtın:
```bash
firebase deploy --only functions
```

Dağıtım işlemi birkaç dakika sürebilir. Tamamlandığında, anlık bildirim sisteminiz aktif hale gelecektir!
