// src/app/(main)/avatar-creator/page.tsx
'use client';

import { useState, useReducer, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/actions/userActions';
import { useRouter } from 'next/navigation';
import { Save, ArrowLeft, Loader2 } from 'lucide-react';
import AvatarPreview, { type AvatarState, initialAvatarState, avatarReducer } from './AvatarPreview';
import CategoryTabs from './CategoryTabs';

export default function AvatarCreatorPage() {
  const [state, dispatch] = useReducer(avatarReducer, initialAvatarState);
  const [svgString, setSvgString] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const handleSave = async () => {
    if (!user || !svgString) return;
    setIsSaving(true);
    try {
      // Convert the final SVG string to a Base64 Data URL
      const dataUrl = `data:image/svg+xml;base64,${btoa(svgString)}`;
      
      // Update user profile with the new avatar
      await updateUserProfile({ userId: user.uid, photoURL: dataUrl });
      
      toast({ description: "Avatar başarıyla kaydedildi!" });
      router.push(`/profile/${user.uid}`);
    } catch (error: any) {
      console.error("Avatar kaydedilirken hata:", error);
      toast({ variant: 'destructive', title: 'Hata', description: 'Avatar kaydedilemedi.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="flex items-center justify-between p-2 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Avatar Oluşturucu</h1>
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2 h-4 w-4" />}
          Kaydet
        </Button>
      </header>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <main className="flex-1 flex items-center justify-center p-4 bg-muted/30">
          <div className="w-64 h-64 md:w-80 md:h-80">
            <AvatarPreview avatarState={state} setSvgString={setSvgString} />
          </div>
        </main>
        <aside className="w-full md:w-80 lg:w-96 border-l bg-card overflow-y-auto">
           <CategoryTabs state={state} dispatch={dispatch} />
        </aside>
      </div>
    </div>
  );
}
