// Bu dosya, Next.js projesinin temel yapılandırmasını içerir.
// PWA ayarları, TypeScript ve ESLint kuralları, ve harici resim kaynakları burada tanımlanır.
import type {NextConfig} from 'next';

// PWA (Progresif Web Uygulaması) özelliklerini etkinleştiren eklenti.
const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public', // PWA ile ilgili dosyaların oluşturulacağı klasör.
  register: true, // Servis çalışanını otomatik olarak kaydet.
  skipWaiting: true, // Yeni sürüm olduğunda eski servis çalışanını beklemeden aktifleştir.
  importScripts: ['/firebase-messaging-sw.js'], // Firebase anlık bildirimleri için gerekli servis çalışanı.
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

// Next.js için ana yapılandırma nesnesi.
const nextConfig: NextConfig = {
  // Derleme sırasında TypeScript hatalarını yoksay.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Derleme sırasında ESLint hatalarını yoksay.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Harici resim kaynaklarını güvenli olarak tanımla.
  // Next.js'in Image bileşeni sadece burada tanımlanan domain'lerden resim optimize eder.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co', // Yer tutucu resimler için.
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com', // Firebase Storage'dan gelen resimler için.
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com', // İleride kullanılabilecek başka bir resim servisi için.
        port: '',
        pathname: '/**',
      },
    ],
  },
};

// PWA yapılandırmasını Next.js yapılandırması ile birleştirip dışa aktar.
export default withPWA(nextConfig);
