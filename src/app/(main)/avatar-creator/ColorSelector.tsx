'use client';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface ColorSelectorProps {
  colors: string[];
  selectedColor: string;
  onSelect: (color: string) => void;
}

export default function ColorSelector({ colors, selectedColor, onSelect }: ColorSelectorProps) {
  return (
    <div className="grid grid-cols-6 gap-2">
      {colors.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onSelect(color)}
          className={cn(
            'w-12 h-12 rounded-lg border-2 flex items-center justify-center transition-all',
            selectedColor === color ? 'border-primary ring-2 ring-primary ring-offset-2 ring-offset-background' : 'border-muted'
          )}
          style={{ backgroundColor: color }}
          aria-label={`Select color ${color}`}
        >
          {selectedColor === color && <Check className="h-6 w-6 text-white mix-blend-difference" />}
        </button>
      ))}
    </div>
  );
}
