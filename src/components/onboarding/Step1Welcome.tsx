'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import ImageCropperDialog from '@/components/common/ImageCropperDialog';

interface Step1WelcomeProps {
    onAvatarChange: (dataUrl: string | null) => void;
}

export default function Step1Welcome({ onAvatarChange }: Step1WelcomeProps) {
  const { user } = useAuth();
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = () => setImageToCrop(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = (dataUrl: string) => {
    setCroppedImage(dataUrl);
    onAvatarChange(dataUrl);
    setImageToCrop(null);
  };

  return (
    <>
      <div className="text-center">
        <h1 className="text-2xl font-bold">Hoş geldin, {user?.displayName}!</h1>
        <p className="text-muted-foreground mt-2">Profilini oluşturarak başlayalım. Harika bir profil fotoğrafı ile başla.</p>
        <div className="mt-8 flex justify-center">
            <div className="relative">
                <Avatar className="h-32 w-32">
                    <AvatarImage src={croppedImage || undefined} />
                    <AvatarFallback className="text-4xl">
                        {user?.displayName?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <Button 
                    size="icon" 
                    className="absolute bottom-1 right-1 rounded-full h-10 w-10"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Camera className="h-5 w-5" />
                </Button>
            </div>
        </div>
      </div>
      <ImageCropperDialog 
        isOpen={!!imageToCrop}
        setIsOpen={() => setImageToCrop(null)}
        imageSrc={imageToCrop}
        aspectRatio={1}
        onCropComplete={handleCropComplete}
        circularCrop={true}
      />
    </>
  );
}
