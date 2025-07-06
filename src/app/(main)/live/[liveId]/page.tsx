
// src/app/(main)/live/[liveId]/page.tsx
'use client';

import { useParams } from 'next/navigation';

export default function LiveStreamPage() {
  const params = useParams();
  const liveId = params.liveId as string;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-black text-white">
      <h1 className="text-2xl font-bold">Canlı Yayın</h1>
      <p>Yayın ID: {liveId}</p>
      <p className="mt-4 text-muted-foreground">(Canlı yayın izleme arayüzü yakında burada olacak)</p>
    </div>
  );
}
