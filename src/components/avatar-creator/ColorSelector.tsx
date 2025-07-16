// src/components/avatar-creator/ColorSelector.tsx
'use client';

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ColorSelectorProps {
    colors: string[];
    selectedColor: string;
    onColorChange: (color: string) => void;
}

export default function ColorSelector({ colors, selectedColor, onColorChange }: ColorSelectorProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {colors.map(color => (
                <button
                    key={color}
                    onClick={() => onColorChange(color)}
                    className={cn(
                        "h-10 w-10 rounded-full border-2 transition-transform hover:scale-110",
                        selectedColor === color ? 'border-primary' : 'border-muted'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Select color ${color}`}
                >
                    {selectedColor === color && <Check className="h-6 w-6 text-primary-foreground" />}
                </button>
            ))}
        </div>
    )
}
