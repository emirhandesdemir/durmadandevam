// src/app/(main)/avatar-creator/ColorSelector.tsx
'use client';
import { cn } from "@/lib/utils"
import { Check } from 'lucide-react';

interface ColorSelectorProps {
    title?: string;
    colors: string[];
    selectedColor: string;
    onColorSelect: (color: string) => void;
}

export default function ColorSelector({ title, colors, selectedColor, onColorSelect }: ColorSelectorProps) {
    return (
        <div className="space-y-2">
            {title && <h3 className="font-semibold">{title}</h3>}
            <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                    <button
                        key={color}
                        type="button"
                        onClick={() => onColorSelect(color)}
                        className={cn("w-10 h-10 rounded-full border-2 transition-all", selectedColor === color ? "border-primary scale-110" : "border-transparent")}
                        style={{ backgroundColor: color }}
                        aria-label={`Select color ${color}`}
                    >
                        {selectedColor === color && (
                            <Check className="w-5 h-5 mx-auto text-primary-foreground" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
}
