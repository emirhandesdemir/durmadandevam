
// Bu dosya, uygulamanın en dış katmanını oluşturan kök düzendir (root layout).
// Tüm sayfalar bu düzenin içinde render edilir.
// HTML ve BODY etiketlerini, temel fontları, tema ve kimlik doğrulama sağlayıcılarını içerir.
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import NetworkStatusNotifier from '@/components/common/NetworkStatusNotifier';
import I18nProvider from '@/components/common/I18nProvider';
import NotificationPermissionManager from '@/components/common/NotificationPermissionManager';
import 'leaflet/dist/leaflet.css';

// Google Fonts'tan Inter font ailesini yüklüyoruz.
const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans', // CSS'te bu değişken adıyla kullanılabilir.
  weight: ['400', '500', '600', '700', '800']
});

// Sayfa meta verileri (SEO ve PWA için önemli).
export const metadata: Metadata = {
  title: 'HiweWalk',
  description: 'Herkese açık odalar oluşturun ve katılın.',
  manifest: '/manifest.json', // PWA manifest dosyası.
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon.svg', // Apple cihazlar için ikon.
  },
  applicationName: "HiweWalk",
  appleWebApp: {
    capable: true, // iOS'ta tam ekran PWA olarak çalışabilir.
    statusBarStyle: "default",
    title: "HiweWalk",
  },
  formatDetection: {
    telephone: false, // Telefon numaralarının otomatik olarak linke çevrilmesini engelle.
  },
};

// Mobil cihazlarda tarayıcı çubuğunun rengi gibi viewport ayarları.
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
          {/* OneSignal SDK script is now handled through next-pwa for better PWA compatibility */}
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased font-medium',
          inter.variable // Inter fontunu tüm body'e uygula.
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          {/* Kimlik Doğrulama Sağlayıcısı: Tüm alt bileşenlerin kullanıcı verisine erişmesini sağlar. */}
          <AuthProvider>
             <I18nProvider>
                <NotificationPermissionManager />
                {children}
                <Toaster />
                <NetworkStatusNotifier />
            </I18nProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
