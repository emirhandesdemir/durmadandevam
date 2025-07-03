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
import DynamicTheme from '@/components/layout/DynamicTheme';
import { getThemeSettings } from '@/lib/actions/themeActions';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeSettings = await getThemeSettings();

  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <DynamicTheme />
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
          defaultTheme={themeSettings.defaultMode || "system"}
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
