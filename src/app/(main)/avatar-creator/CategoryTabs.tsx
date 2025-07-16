// src/app/(main)/avatar-creator/CategoryTabs.tsx
'use client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import OptionSelector from "./OptionSelector"
import ColorSelector from "./ColorSelector"
import type { AvatarState } from './AvatarPreview'

interface CategoryTabsProps {
    state: AvatarState;
    dispatch: React.Dispatch<{ type: string; payload: any; }>;
}

const hairStyles = [{ id: 'short', label: 'Kısa' }, { id: 'long', label: 'Uzun' }, { id: 'buzz', label: 'Sıfır Numara' }];
const hairColors = ['#2C1404', '#4E342E', '#A1887F', '#FFEB3B', '#F44336', '#9C27B0'];
const eyeShapes = [{ id: 'default', label: 'Normal' }, { id: 'narrow', label: 'Çekik' }];
const eyeColors = ['#6A4B3A', '#4285F4', '#34A853', '#757575'];
const skinTones = ['#F2D5B1', '#E0A375', '#A0522D', '#5C2E1A'];
const eyebrowShapes = [{id: 'default', label: 'Normal'}, {id: 'thin', label: 'İnce'}, {id: 'angry', label: 'Kızgın'}];
const eyebrowColors = ['#2C1404', '#4E342E', '#A1887F', '#616161'];
const clothingStyles = [{ id: 'tshirt', label: 'Tişört' }, { id: 'hoodie', label: 'Kapüşonlu' }];
const clothingColors = ['#5A63A5', '#E91E63', '#4CAF50', '#212121', '#FFFFFF'];

export default function CategoryTabs({ state, dispatch }: CategoryTabsProps) {

    return (
         <Tabs defaultValue="gender" className="w-full h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-4 shrink-0">
                <TabsTrigger value="gender">Temel</TabsTrigger>
                <TabsTrigger value="hair">Saç</TabsTrigger>
                <TabsTrigger value="face">Yüz</TabsTrigger>
                <TabsTrigger value="clothing">Kıyafet</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1 p-4">
                 <TabsContent value="gender" className="mt-0 space-y-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold">Cinsiyet</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant={state.gender === 'male' ? 'secondary' : 'outline'} onClick={() => dispatch({ type: 'SET_GENDER', payload: 'male'})}>Erkek</Button>
                            <Button variant={state.gender === 'female' ? 'secondary' : 'outline'} onClick={() => dispatch({ type: 'SET_GENDER', payload: 'female'})}>Kadın</Button>
                        </div>
                    </div>
                     <div className="space-y-2">
                        <h3 className="font-semibold">Ten Rengi</h3>
                        <ColorSelector colors={skinTones} selectedColor={state.skinTone} onColorSelect={(color) => dispatch({ type: 'SET_SKIN_TONE', payload: color })} />
                     </div>
                 </TabsContent>
                 <TabsContent value="hair" className="mt-0 space-y-6">
                    <OptionSelector title="Saç Stili" options={hairStyles} selectedOption={state.hair.shape} onOptionSelect={(style) => dispatch({ type: 'SET_HAIR_STYLE', payload: style })} />
                    <ColorSelector title="Saç Rengi" colors={hairColors} selectedColor={state.hair.color} onColorSelect={(color) => dispatch({ type: 'SET_HAIR_COLOR', payload: color })} />
                 </TabsContent>
                 <TabsContent value="face" className="mt-0 space-y-6">
                    <OptionSelector title="Göz Şekli" options={eyeShapes} selectedOption={state.eyes.shape} onOptionSelect={(shape) => dispatch({ type: 'SET_EYE_SHAPE', payload: shape })} />
                    <ColorSelector title="Göz Rengi" colors={eyeColors} selectedColor={state.eyes.color} onColorSelect={(color) => dispatch({ type: 'SET_EYE_COLOR', payload: color })} />
                    <OptionSelector title="Kaşlar" options={eyebrowShapes} selectedOption={state.eyebrows.shape} onOptionSelect={(shape) => dispatch({ type: 'SET_EYEBROW_SHAPE', payload: shape })} />
                    <ColorSelector title="Kaş Rengi" colors={eyebrowColors} selectedColor={state.eyebrows.color} onColorSelect={(color) => dispatch({ type: 'SET_EYEBROW_COLOR', payload: color })} />
                 </TabsContent>
                 <TabsContent value="clothing" className="mt-0 space-y-6">
                    <OptionSelector title="Kıyafet Stili" options={clothingStyles} selectedOption={state.clothing.shape} onOptionSelect={(style) => dispatch({ type: 'SET_CLOTHING_STYLE', payload: style })} />
                    <ColorSelector title="Kıyafet Rengi" colors={clothingColors} selectedColor={state.clothing.color} onColorSelect={(color) => dispatch({ type: 'SET_CLOTHING_COLOR', payload: color })} />
                 </TabsContent>
            </ScrollArea>
        </Tabs>
    )
}
