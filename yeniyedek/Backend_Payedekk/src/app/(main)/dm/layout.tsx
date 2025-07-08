// src/app/(main)/dm/layout.tsx
import { ReactNode } from 'react';

// Bu layout, DM sayfalarının (hem liste hem de sohbet)
// tam ekran yüksekliğini kullanmasını sağlar.
export default function DmLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-full">
      {children}
    </div>
  );
}
