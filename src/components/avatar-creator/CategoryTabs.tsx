// src/components/avatar-creator/CategoryTabs.tsx
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FACIAL_HAIR_OPTIONS, HAIR_OPTIONS, EYES_OPTIONS, EYEBROWS_OPTIONS, MOUTH_OPTIONS, NOSE_OPTIONS } from './options';
import type { AvatarState } from './types';
import OptionSelector from './OptionSelector';
import ColorSelector from './ColorSelector';
import { ScrollArea } from '../ui/scroll-area';

interface CategoryTabsProps {
    avatarState: AvatarState;
    onStateChange: (newState: AvatarState) => void;
}

export default function CategoryTabs({ avatarState, onStateChange }: CategoryTabsProps) {
    
    const handleValueChange = (category: keyof AvatarState, key: 'style' | 'color', value: string) => {
        if (category === 'skinColor') {
            onStateChange({ ...avatarState, skinColor: value });
        } else if (category === 'hair' || category === 'eyes') {
            const current = avatarState[category];
            onStateChange({ ...avatarState, [category]: { ...current, [key]: value } });
        } else if(category !== 'gender') {
             const current = avatarState[category];
             onStateChange({ ...avatarState, [category]: { ...current, style: value } });
        }
    };
    
    return (
        <Tabs defaultValue="skin" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
                <TabsTrigger value="skin">Cilt</TabsTrigger>
                <TabsTrigger value="hair">Saç</TabsTrigger>
                <TabsTrigger value="eyes">Göz</TabsTrigger>
                <TabsTrigger value="eyebrows">Kaş</TabsTrigger>
                <TabsTrigger value="nose">Burun</TabsTrigger>
                <TabsTrigger value="mouth">Ağız</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 mt-4">
                <TabsContent value="skin" className="space-y-4">
                    <h3 className="font-semibold">Ten Rengi</h3>
                    <ColorSelector
                        selectedColor={avatarState.skinColor}
                        onColorChange={(color) => handleValueChange('skinColor', 'color', color)}
                        colors={['#F2C8AD', '#DEB887', '#C68642', '#8D5524', '#6A401A', '#3C2E1E']}
                    />
                </TabsContent>
                <TabsContent value="hair" className="space-y-4">
                    <h3 className="font-semibold">Saç Stili</h3>
                    <OptionSelector 
                        options={HAIR_OPTIONS[avatarState.gender]} 
                        selectedValue={avatarState.hair.style}
                        onValueChange={(value) => handleValueChange('hair', 'style', value)}
                    />
                     <h3 className="font-semibold">Saç Rengi</h3>
                    <ColorSelector 
                         selectedColor={avatarState.hair.color}
                        onColorChange={(color) => handleValueChange('hair', 'color', color)}
                        colors={['#2C1B10', '#4B3621', '#A9A9A9', '#B87333', '#FFD700', '#C0C0C0', '#E6E6FA']}
                    />
                </TabsContent>
                 <TabsContent value="eyes" className="space-y-4">
                    <h3 className="font-semibold">Göz Şekli</h3>
                    <OptionSelector
                        options={EYES_OPTIONS}
                        selectedValue={avatarState.eyes.style}
                        onValueChange={(value) => handleValueChange('eyes', 'style', value)}
                     />
                     <h3 className="font-semibold">Göz Rengi</h3>
                    <ColorSelector 
                        selectedColor={avatarState.eyes.color}
                        onColorChange={(color) => handleValueChange('eyes', 'color', color)}
                        colors={['#5A3825', '#007000', '#2E86C1', '#808080', '#000000']}
                    />
                </TabsContent>
                <TabsContent value="eyebrows" className="space-y-4">
                     <h3 className="font-semibold">Kaş Şekli</h3>
                    <OptionSelector
                        options={EYEBROWS_OPTIONS}
                        selectedValue={avatarState.eyebrows.style}
                        onValueChange={(value) => handleValueChange('eyebrows', 'style', value)}
                     />
                </TabsContent>
                <TabsContent value="nose" className="space-y-4">
                     <h3 className="font-semibold">Burun Şekli</h3>
                    <OptionSelector
                        options={NOSE_OPTIONS}
                        selectedValue={avatarState.nose.style}
                        onValueChange={(value) => handleValueChange('nose', 'style', value)}
                     />
                </TabsContent>
                <TabsContent value="mouth" className="space-y-4">
                    <h3 className="font-semibold">Ağız Şekli</h3>
                    <OptionSelector
                        options={MOUTH_OPTIONS}
                        selectedValue={avatarState.mouth.style}
                        onValueChange={(value) => handleValueChange('mouth', 'style', value)}
                    />
                </TabsContent>
            </ScrollArea>
        </Tabs>
    );
}
