// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import multiavatar from '@multiavatar/multiavatar';
import { updateUserProfile } from '@/lib/actions/userActions';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AvatarStudioPage() {
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [avatarId, setAvatarId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (userData) {
      setAvatarId(userData.username || uuidv4());
    }
  }, [userData]);

  const avatarSvg = useMemo(() => {
    if (!avatarId) return '';
    return multiavatar(avatarId);
  }, [avatarId]);

  const handleRandomize = () => {
    setAvatarId(uuidv4());
  };

  const handleSave = async () => {
    if (!user || !avatarSvg) return;
    setIsSaving(true);
    try {
      const dataUrl = `data:image/svg+xml;base64,${btoa(avatarSvg)}`;
      await updateUserProfile({ userId: user.uid, photoURL: dataUrl });
      toast({
        title: "Başarılı!",
        description: "Yeni avatarınız kaydedildi.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: "Avatar kaydedilirken bir sorun oluştu: " + error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Avatar Stüdyosu</CardTitle>
          <CardDescription>
            Bir metin girerek veya rastgele oluşturarak benzersiz avatarınızı yaratın.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div
            className="w-48 h-48 mx-auto bg-gray-200 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg"
            dangerouslySetInnerHTML={{ __html: avatarSvg }}
          />
          <div className="space-y-2">
            <Input
              placeholder="Avatarınız için bir metin girin..."
              value={avatarId}
              onChange={(e) => setAvatarId(e.target.value)}
              className="text-center"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={handleRandomize}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Rastgele
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Kaydet
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
