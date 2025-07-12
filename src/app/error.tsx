'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // İsteğe bağlı: Hatayı bir raporlama servisine gönder
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background p-4 text-center">
        <Card className="w-full max-w-md shadow-lg">
            <CardHeader className="items-center">
                <ShieldAlert className="h-12 w-12 text-destructive" />
                <CardTitle className="mt-4 text-2xl">Bir Hata Oluştu</CardTitle>
                <CardDescription>
                    Beklenmedik bir sorunla karşılaştık. Lütfen tekrar deneyin veya ana sayfaya dönün.
                </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
                 <Button onClick={() => reset()}>
                    Tekrar Dene
                </Button>
                <p className="text-xs text-muted-foreground">veya</p>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                    Ana Sayfaya Dön
                </Button>
            </CardContent>
        </Card>
    </div>
  );
}
