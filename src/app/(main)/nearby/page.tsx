'use client';

import { Map } from 'lucide-react';

export default function NearbyPage() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <Map className="h-16 w-16 text-primary" />
      <h1 className="text-2xl font-bold">Yakındakileri Keşfet</h1>
      <p className="text-muted-foreground max-w-sm">
        Bu özellik yakında geliyor! Harita üzerinde yakındaki diğer kullanıcıları görebilecek ve onlarla etkileşim kurabileceksiniz.
      </p>
    </div>
  );
}
