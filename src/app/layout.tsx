import type { Metadata, Viewport } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import './globals.css';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import NetworkStatusNotifier from '@/components/common/NetworkStatusNotifier';
import PwaGate from '@/components/common/PwaGate';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800']
});

export const metadata: Metadata = {
  title: 'HiweWalk',
  description: 'Herkese açık odalar oluşturun ve katılın.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-512x512.png',
    apple: '/icons/icon-512x512.png',
  },
  applicationName: "HiweWalk",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HiweWalk",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#09090B',
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
      <head />
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased font-medium',
          inter.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <PwaGate />
            {children}
            <Toaster />
            <NetworkStatusNotifier />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
