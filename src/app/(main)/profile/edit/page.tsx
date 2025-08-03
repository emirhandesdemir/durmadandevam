// src/app/(main)/profile/edit/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { updateUserProfile } from '@/lib/actions/userActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Loader2, ChevronLeft, Save, Camera, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import ImageCropperDialog from '@/components/common/ImageCropperDialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const profileSchema = z.object({
  username: z.string()
    .min(3, { message: "Kullanıcı adı en az 3 karakter olmalıdır." })
    .max(20, { message: "Kullanıcı adı en fazla 20 karakter olabilir."})
    .regex(/^[a-zA-Z0-9_]+$/, { message: "Sadece harf, rakam ve alt çizgi kullanılabilir." }),
  bio: z.string().max(150, { message: "Biyografi en fazla 150 karakter olabilir." }).optional(),
  age: z.coerce.number().min(13, { message: "En az 13 yaşında olmalısınız." }).max(100, { message: "Yaşınız 100'den büyük olamaz." }).optional().nullable(),
  city: z.string().max(50, { message: "Şehir en fazla 50 karakter olabilir." }).optional(),
  interests: z.array(z.string()).max(10, { message: "En fazla 10 ilgi alanı ekleyebilirsiniz." }).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function EditProfilePage() {
  const { user, userData, loading, refreshUserData } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [interestInput, setInterestInput] = useState('');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      username: '',
      bio: '',
      age: null,
      city: '',
      interests: [],
    },
  });

  useEffect(() => {
    if (userData) {
      form.reset({
        username: userData.username || '',
        bio: userData.bio || '',
        age: userData.age || null,
        city: userData.city || '',
        interests: userData.interests || [],
      });
      setCroppedImage(userData.photoURL);
    }
  }, [userData, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
       if (file.size > 10 * 1024 * 1024) { 
          toast({ variant: "destructive", title: "Dosya Çok Büyük", description: "Resim boyutu 10MB'dan büyük olamaz." });
          return;
      }
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleInterestKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && interestInput.trim()) {
      e.preventDefault();
      const currentInterests = form.getValues('interests') || [];
      if (currentInterests.length < 10 && !currentInterests.includes(interestInput.trim())) {
        form.setValue('interests', [...currentInterests, interestInput.trim()]);
        setInterestInput('');
      } else if (currentInterests.length >= 10) {
          toast({ variant: 'destructive', description: "En fazla 10 ilgi alanı ekleyebilirsiniz."});
      }
    }
  };

  const removeInterest = (interestToRemove: string) => {
    const currentInterests = form.getValues('interests') || [];
    form.setValue('interests', currentInterests.filter(i => i !== interestToRemove));
  };


  const onSubmit = async (data: ProfileFormValues) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await updateUserProfile({
        userId: user.uid,
        ...data,
        photoURL: croppedImage,
      });
      await refreshUserData(); // Refresh context data
      toast({ title: 'Başarılı', description: 'Profiliniz güncellendi.' });
      router.back();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.message || 'Profil güncellenirken bir hata oluştu.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full">
          <header className="flex items-center justify-between p-2 border-b">
            <Button type="button" onClick={() => router.back()} variant="ghost" className="rounded-full">
              <ChevronLeft className="mr-2 h-4 w-4" /> Geri
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Kaydet
            </Button>
          </header>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="h-28 w-28 border-4 border-muted">
                  <AvatarImage src={croppedImage || userData.photoURL || undefined} />
                  <AvatarFallback className="text-4xl">{userData.username?.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-8 w-8 text-white" />
                </button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kullanıcı Adı</FormLabel>
                  <FormControl>
                    <Input placeholder="gorkem_123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Biyografi</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Kendinizden bahsedin..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Yaş</FormLabel>
                        <FormControl>
                            <Input type="number" placeholder="25" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Şehir</FormLabel>
                        <FormControl>
                            <Input placeholder="İstanbul" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                />
            </div>
            
            <FormField
                control={form.control}
                name="interests"
                render={({ field }) => (
                    <FormItem>
                        <FormLabel>İlgi Alanları</FormLabel>
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[40px]">
                            {field.value?.map((interest) => (
                                <Badge key={interest} variant="secondary" className="gap-1">
                                    {interest}
                                    <button type="button" onClick={() => removeInterest(interest)} className="rounded-full hover:bg-destructive/20 p-0.5">
                                        <X className="h-3 w-3" />
                                    </button>
                                </Badge>
                            ))}
                             <Input
                                value={interestInput}
                                onChange={(e) => setInterestInput(e.target.value)}
                                onKeyDown={handleInterestKeyDown}
                                placeholder="Ekle ve Enter'a bas..."
                                className="flex-1 border-none shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent"
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">En fazla 10 tane ekleyebilirsiniz.</p>
                        <FormMessage />
                    </FormItem>
                )}
            />

          </div>
        </form>
      </Form>
      <ImageCropperDialog
        isOpen={!!imageToCrop}
        setIsOpen={() => setImageToCrop(null)}
        imageSrc={imageToCrop}
        aspectRatio={1}
        circularCrop={true}
        onCropComplete={setCroppedImage}
      />
    </>
  );
}
