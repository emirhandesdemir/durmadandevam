// src/app/(main)/dm/layout.tsx
import { ReactNode } from 'react';

/**
 * Bu layout, DM sayfalarının (hem liste hem de sohbet detay)
 * tam ekran yüksekliğini kullanmasını ve scrollbar sorunları yaşamamasını sağlar.
 * Direkt mesajlaşma bölümünün genel çerçevesini oluşturur.
 */
export default function DmLayout({ children }: { children: ReactNode }) {
  return (
    // 'h-full' class'ı ile bu layout'un ebeveyninden gelen tüm yüksekliği kaplamasını sağlıyoruz.
    <div className="h-full">
      {children}
    </div>
  );
}
