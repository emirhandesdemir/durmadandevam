'use client';
import { useState, useEffect } from 'react';
import multiavatar from '@multiavatar/multiavatar';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shuffle, Save, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

export default function AvatarStudioPage() {
  const { user, userData } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [avatarString, setAvatarString] = useState('');
  const [svgString, setSvgString] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Generate an initial random avatar when the component mounts
    handleRandomize();
  }, []);
  
  useEffect(() => {
    if (avatarString) {
      const svg = multiavatar(avatarString);
      setSvgString(svg);
    }
  }, [avatarString]);

  const handleRandomize = () => {
    const randomString = Math.random().toString(36).substring(2, 15);
    setAvatarString(randomString);
    setIsSaved(false);
  };

  const handleSave = async () => {
    if (!user || !svgString) return;
    setIsLoading(true);

    try {
      const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
      await updateUserProfile({
        userId: user.uid,
        photoURL: dataUrl,
      });
      toast({
        title: "Başarılı!",
        description: "Yeni avatarınız başarıyla kaydedildi.",
      });
      setIsSaved(true);
      router.push('/home'); // Redirect to home after saving
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Avatar kaydedilirken bir sorun oluştu.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4">
      <div className="w-full max-w-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold">Avatar Stüdyosu</h1>
        <p className="text-muted-foreground">Bir metin girerek veya rastgele oluşturarak benzersiz avatarınızı yaratın.</p>

        <Card className="p-4 bg-muted/30">
          <CardContent className="p-0">
            {svgString ? (
              <div
                className="w-full h-64"
                dangerouslySetInnerHTML={{ __html: svgString }}
              />
            ) : (
              <div className="w-full h-64 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            )}
          </CardContent>
        </Card>
        
        <div className="space-y-4">
          <Input
            value={avatarString}
            onChange={(e) => setAvatarString(e.target.value)}
            placeholder="Avatar metnini girin..."
          />
          <div className="grid grid-cols-2 gap-4">
            <Button onClick={handleRandomize} variant="outline">
              <Shuffle className="mr-2 h-4 w-4" />
              Rastgele
            </Button>
            <Button onClick={handleSave} disabled={isLoading || !avatarString.trim()}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : isSaved ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isSaved ? "Kaydedildi" : "Kaydet"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
