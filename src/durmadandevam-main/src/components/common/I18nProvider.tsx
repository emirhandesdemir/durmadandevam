
'use client';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';
import { ReactNode, Suspense } from 'react';

/**
 * Bu bileşen, `react-i18next` kütüphanesinin context sağlayıcısını sarmalar.
 * Dil algılama gibi asenkron işlemler için `Suspense` kullanır.
 * Root layout'ta tüm uygulamayı sararak dil yönetimi özelliklerini
 * tüm alt bileşenlere aktarır.
 */
export default function I18nProvider({ children }: { children: ReactNode }) {
    return (
        <Suspense>
            <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
        </Suspense>
    );
}
