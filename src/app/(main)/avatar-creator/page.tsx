
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs } from '@/components/ui/tabs';
import { ArrowLeft, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/lib/actions/userActions';
import AvatarPreview from './AvatarPreview';
import CategoryTabs, { categories } from './CategoryTabs';
import OptionSelector from './OptionSelector';
import ColorSelector from './ColorSelector';
import { renderToString } from 'react-dom/server';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';


export interface AvatarState {
  gender: 'male' | 'female';
  skinColor: string;
  hair: { style: string; color: string; };
  eyes: { style: string; color: string; };
  eyebrows: { style: string; };
  nose: { style: string; };
  mouth: { style: string; };
  clothes: { style: string; color: string; };
}

// In a real app, these would be fetched or more extensive
const hairStyles = [{ id: 'style1', label: 'Kısa' }, { id: 'style2', label: 'Orta' }, { id: 'style3', label: 'Uzun' }];
const eyeStyles = [{ id: 'style1', label: 'Yuvarlak' }, { id: 'style2', label: 'Çekik' }];
const eyebrowStyles = [{ id: 'style1', label: 'Kavisli' }, { id: 'style2', label: 'Düz' }];
const noseStyles = [{ id: 'style1', label: 'Kemerli' }, { id: 'style2', label: 'Düz' }];
const mouthStyles = [{ id: 'style1', label: 'Gülümseyen' }, { id: 'style2', label: 'Düz' }];
const clothesStyles = [{ id: 'style1', label: 'T-Shirt' }, { id: 'style2', label: 'Gömlek' }];

const skinTones = ['#F9E4D6', '#E0A39A', '#D49A6A', '#A87556', '#664238', '#382823'];
const hairColors = ['#000000', '#4B3F35', '#F2D399', '#C53030', '#6A4D93'];
const eyeColors = ['#5E3C2B', '#2E6E6A', '#3498DB', '#2ECC71'];
const clothesColors = ['#E74C3C', '#3498DB', '#2ECC71', '#F1C40F', '#9B59B6'];

export default function AvatarCreatorPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [svgString, setSvgString] = useState('');

  const [avatarState, setAvatarState] = useState<AvatarState>({
    gender: 'female',
    skinColor: '#F9E4D6',
    hair: { style: 'style1', color: '#4B3F35' },
    eyes: { style: 'style1', color: '#5E3C2B' },
    eyebrows: { style: 'style1' },
    nose: { style: 'style1' },
    mouth: { style: 'style1' },
    clothes: { style: 'style1', color: '#3498DB' },
  });

  const [selectedCategory, setSelectedCategory] = useState('face');

  const handleSave = async () => {
     if (!user) {
        toast({ variant: 'destructive', description: 'Kaydetmek için giriş yapmalısınız.'});
        return;
    }
    if (!svgString) {
        toast({ variant: 'destructive', description: 'Kaydedilecek avatar bulunamadı.'});
        return;
    }

    toast({ description: "Avatar kaydediliyor..."});
    
    try {
        await updateUserProfile({ 
            userId: user.uid, 
            photoURL: `data:image/svg+xml;base64,${btoa(svgString)}`
        });
        toast({ description: "Avatar başarıyla kaydedildi!"});
        router.back();
    } catch(error: any) {
        toast({ variant: 'destructive', description: `Hata: ${error.message}` });
    }
  };


  const renderPreview = (style: string, category: string) => {
    // This is a placeholder for rendering small SVG previews of each option
    return <div className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center text-xs">{style}</div>
  }
  
  return (
    <div className="flex flex-col h-full bg-background">
      <header className="p-2 flex items-center justify-between border-b">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Avatar Oluşturucu</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Preview Panel */}
        <div className="md:w-1/2 flex items-center justify-center p-4 bg-muted/30 border-b md:border-b-0 md:border-r">
          <AvatarPreview avatarState={avatarState} setSvgString={setSvgString} />
        </div>

        {/* Customization Panel */}
        <div className="md:w-1/2 flex flex-col">
           <div className="p-2 border-b">
              <Tabs defaultValue="face" onValueChange={setSelectedCategory} className="w-full">
                <CategoryTabs selectedCategory={selectedCategory} onSelect={setSelectedCategory} />
              </Tabs>
           </div>
          <div className="p-4 space-y-4 overflow-y-auto">
            <h2 className="font-bold text-xl">{categories.find(c => c.id === selectedCategory)?.label}</h2>
             {selectedCategory === 'face' && (
                <ColorSelector colors={skinTones} selectedColor={avatarState.skinColor} onSelect={(color) => setAvatarState(s => ({...s, skinColor: color}))} />
             )}
             {selectedCategory === 'hair' && (
                <div className="space-y-4">
                     <OptionSelector options={hairStyles} selectedOption={avatarState.hair.style} onSelect={(style) => setAvatarState(s => ({ ...s, hair: { ...s.hair, style } }))} renderPreview={(style) => renderPreview(style, 'hair')} />
                     <ColorSelector colors={hairColors} selectedColor={avatarState.hair.color} onSelect={(color) => setAvatarState(s => ({ ...s, hair: { ...s.hair, color } }))} />
                </div>
             )}
             {selectedCategory === 'eyes' && (
                <div className="space-y-4">
                     <OptionSelector options={eyeStyles} selectedOption={avatarState.eyes.style} onSelect={(style) => setAvatarState(s => ({ ...s, eyes: { ...s.eyes, style } }))} renderPreview={(style) => renderPreview(style, 'eyes')} />
                     <ColorSelector colors={eyeColors} selectedColor={avatarState.eyes.color} onSelect={(color) => setAvatarState(s => ({ ...s, eyes: { ...s.eyes, color } }))} />
                </div>
             )}
            {selectedCategory === 'eyebrows' && (
                 <OptionSelector options={eyebrowStyles} selectedOption={avatarState.eyebrows.style} onSelect={(style) => setAvatarState(s => ({ ...s, eyebrows: { style } }))} renderPreview={(style) => renderPreview(style, 'eyebrows')} />
            )}
            {selectedCategory === 'nose' && (
                 <OptionSelector options={noseStyles} selectedOption={avatarState.nose.style} onSelect={(style) => setAvatarState(s => ({ ...s, nose: { style } }))} renderPreview={(style) => renderPreview(style, 'nose')} />
            )}
             {selectedCategory === 'mouth' && (
                 <OptionSelector options={mouthStyles} selectedOption={avatarState.mouth.style} onSelect={(style) => setAvatarState(s => ({ ...s, mouth: { style } }))} renderPreview={(style) => renderPreview(style, 'mouth')}/>
            )}
             {selectedCategory === 'clothes' && (
                 <div className="space-y-4">
                    <OptionSelector options={clothesStyles} selectedOption={avatarState.clothes.style} onSelect={(style) => setAvatarState(s => ({ ...s, clothes: {...s.clothes, style} }))} renderPreview={(style) => renderPreview(style, 'clothes')} />
                    <ColorSelector colors={clothesColors} selectedColor={avatarState.clothes.color} onSelect={(color) => setAvatarState(s => ({ ...s, clothes: {...s.clothes, color} }))} />
                 </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
