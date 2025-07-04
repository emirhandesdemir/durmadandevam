
// Bu dosya, uygulamanın en dış katmanını oluşturan kök düzendir (root layout).
// Tüm sayfalar bu düzenin içinde render edilir.
// HTML ve BODY etiketlerini, temel fontları, tema ve kimlik doğrulama sağlayıcılarını içerir.
import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import { Plus_Jakarta_Sans, Inter, Poppins, Lato } from 'next/font/google'; 
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import NetworkStatusNotifier from '@/components/common/NetworkStatusNotifier';
import I18nProvider from '@/components/common/I18nProvider';
import Script from 'next/script';

// Google Fonts'tan font ailelerini yüklüyoruz.
const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'], 
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800']
});
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-poppins' });
const lato = Lato({ subsets: ['latin'], weight: ['400', '700'], variable: '--font-lato' });

// Sayfa meta verileri (SEO ve PWA için önemli).
export const metadata: Metadata = {
  title: 'HiweWalk',
  description: 'Herkese açık odalar oluşturun ve katılın.',
  manifest: '/manifest.json', // PWA manifest dosyası.
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192x192.png', // Apple cihazlar için ikon.
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
  themeColor: '#7c3aed', // Primary color
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1, // Kullanıcının zoom yapmasını engelle (uygulama hissi için).
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
        {/* OneSignal SDK'sını ve başlatma script'ini ekle */}
        <Script
            src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js"
            defer
        />
        <Script id="onesignal-init">
        {`
            window.OneSignalDeferred = window.OneSignalDeferred || [];
            OneSignalDeferred.push(function(OneSignal) {
              OneSignal.init({
                appId: "51c67432-a305-43fc-a4c8-9c5d9d478d1c",
                allowLocalhostAsSecureOrigin: true, // For local development
                autoResubscribe: true, // Re-subscribe users who clear their cache
                notifyButton: {
                  enable: false, // We use our own custom prompt
                },
              });
            });
        `}
        </Script>
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased font-medium',
           jakarta.variable,
           inter.variable,
           poppins.variable,
           lato.variable
        )}
      >
        {/* Tema Sağlayıcısı (Aydınlık/Karanlık Mod) */}
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* Kimlik Doğrulama Sağlayıcısı: Tüm alt bileşenlerin kullanıcı verisine erişmesini sağlar. */}
          <AuthProvider>
             <I18nProvider>
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
