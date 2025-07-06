import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PenSquare, Video } from 'lucide-react';

export default function CreateSelectPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 gap-8">
      <h1 className="text-3xl font-bold text-center">Ne oluşturmak istersin?</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link href="/create-post" className="w-full">
          <Card className="p-8 text-center hover:bg-muted hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col items-center justify-center">
            <PenSquare className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold">Gönderi Oluştur</h2>
            <p className="text-muted-foreground mt-2">Resim ve metin içeren bir gönderi paylaş.</p>
          </Card>
        </Link>
        <Link href="/create-video" className="w-full">
          <Card className="p-8 text-center hover:bg-muted hover:border-primary transition-all duration-200 cursor-pointer h-full flex flex-col items-center justify-center">
            <Video className="h-12 w-12 mb-4 text-primary" />
            <h2 className="text-xl font-semibold">Video Paylaş</h2>
            <p className="text-muted-foreground mt-2">Kısa bir video paylaşarak anı yakala.</p>
          </Card>
        </Link>
      </div>
    </div>
  );
}
