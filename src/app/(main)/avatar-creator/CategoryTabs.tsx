
'use client';

import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Face, Gem, Palmtree } from 'lucide-react';
import { User, Eye, Smile, Shirt } from 'lucide-react'; // Replace with better icons


export const categories = [
  { id: 'face', label: 'Yüz', icon: User },
  { id: 'hair', label: 'Saç', icon: Gem },
  { id: 'eyes', label: 'Gözler', icon: Eye },
  { id: 'eyebrows', label: 'Kaşlar', icon: Gem }, // Placeholder icon
  { id: 'nose', label: 'Burun', icon: Gem }, // Placeholder icon
  { id: 'mouth', label: 'Ağız', icon: Smile },
  { id: 'clothes', label: 'Kıyafet', icon: Shirt },
];

interface CategoryTabsProps {
  onSelect: (category: string) => void;
  selectedCategory: string;
}

export default function CategoryTabs({ onSelect, selectedCategory }: CategoryTabsProps) {
  return (
    <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 h-auto">
      {categories.map((cat) => (
        <TabsTrigger
          key={cat.id}
          value={cat.id}
          className="flex-col h-16"
          onClick={() => onSelect(cat.id)}
        >
          <cat.icon className="h-6 w-6 mb-1" />
          <span className="text-xs">{cat.label}</span>
        </TabsTrigger>
      ))}
    </TabsList>
  );
}
