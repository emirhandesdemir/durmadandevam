// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/actions/userActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Wand2, User, RefreshCw, Sparkles, Image as ImageIcon } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { avatarList } from '@/components/common/CustomAvatars';


export default function AvatarStudioPage() {
  const { user, userData, loading: authLoading, refreshUserData } = useAuth();
  const { toast } = useToast();

  const [selectedAvatarId, setSelectedAvatarId] = useState(userData?.photoURL?.startsWith('avatar-') ? userData.photoURL : avatarList[0].id);
  const [isSaving, setIsSaving] = useState(false);

  if (authLoading || !userData) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-10 w-10 animate-spin"/></div>;
  }
  
  const handleSetAvatar = async () => {
    if (!user || !selectedAvatarId) return;
    setIsSaving(true);
    try {
        await updateUserProfile({
            userId: user.uid,
            photoURL: selectedAvatarId,
        });
        await refreshUserData();
        toast({ title: "Başarılı!", description: "Yeni avatarınız ayarlandı." });
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: "Avatar ayarlanırken bir hata oluştu." });
    } finally {
        setIsSaving(false);
    }
  };

  const SelectedAvatarComponent = avatarList.find(a => a.id === selectedAvatarId)?.component;

  return (
    <div className="container mx-auto max-w-2xl py-6">
        <div className="flex items-center gap-3 mb-6">
            <Sparkles className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">Avatar Stüdyosu</h1>
        </div>

        <Card>
            <CardHeader>
                <CardTitle>Avatarını Yarat</CardTitle>
                <CardDescription>Tarzını seç, karakterini oluştur ve profil fotoğrafı olarak ayarla.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                    <p className="text-sm font-medium text-muted-foreground">Önizleme</p>
                    <div className="p-4 border-2 border-dashed rounded-full bg-muted">
                       {SelectedAvatarComponent ? (
                           <SelectedAvatarComponent className="h-32 w-32" />
                       ) : (
                           <div className="h-32 w-32 rounded-full bg-background flex items-center justify-center">
                               <ImageIcon className="h-12 w-12 text-muted-foreground"/>
                           </div>
                       )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <p className="text-sm font-medium text-muted-foreground mb-3">Stil Seç</p>
                    <RadioGroup value={selectedAvatarId} onValueChange={setSelectedAvatarId}>
                        <ScrollArea className="h-64">
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pr-4">
                                {avatarList.map((avatar) => (
                                    <RadioGroupItem key={avatar.id} value={avatar.id} id={avatar.id} className="sr-only" />
                                ))}
                                {avatarList.map((avatar) => {
                                    const AvatarComponent = avatar.component;
                                    return (
                                        <Label
                                            key={avatar.id}
                                            htmlFor={avatar.id}
                                            className={cn(
                                                "flex flex-col items-center justify-center gap-2 rounded-lg border-2 p-3 cursor-pointer hover:bg-accent hover:border-primary/50 transition-all",
                                                selectedAvatarId === avatar.id ? "border-primary bg-primary/10" : "border-muted"
                                            )}
                                        >
                                            <AvatarComponent className="h-12 w-12" />
                                            <span className="text-xs font-semibold text-center">{avatar.name}</span>
                                        </Label>
                                    )
                                })}
                            </div>
                        </ScrollArea>
                    </RadioGroup>
                </div>
            </CardContent>
            <CardFooter className="justify-end">
                <Button onClick={handleSetAvatar} disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <User className="mr-2 h-4 w-4"/>}
                  Avatar Olarak Ayarla
                </Button>
            </CardFooter>
        </Card>
    </div>
  );
}
