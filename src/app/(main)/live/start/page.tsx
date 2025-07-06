
// src/app/(main)/live/start/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Radio } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { startLiveStream } from '@/lib/actions/liveActions';

export default function StartLivePage() {
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleStartStream = async () => {
    if (!user || !userData) {
      toast({ variant: 'destructive', description: 'Giriş yapmalısınız.' });
      return;
    }
    if (!title.trim()) {
      toast({ variant: 'destructive', description: 'Lütfen bir başlık girin.' });
      return;
    }
    setIsLoading(true);
    try {
      const result = await startLiveStream({
        uid: user.uid,
        username: userData.username,
        photoURL: userData.photoURL || null,
      }, title);

      if (result.success && result.liveId) {
        toast({ description: 'Canlı yayın başlatılıyor...' });
        router.replace(`/live/${result.liveId}`);
      } else {
        throw new Error('Canlı yayın başlatılamadı.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', description: error.message });
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio /> Canlı Yayın Başlat</CardTitle>
          <CardDescription>Yayınınız için bir başlık belirleyin ve hemen başlayın.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="title">Yayın Başlığı</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Örn: Soru-cevap yapıyoruz!" 
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={handleStartStream} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
            Canlı Yayına Geç
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
