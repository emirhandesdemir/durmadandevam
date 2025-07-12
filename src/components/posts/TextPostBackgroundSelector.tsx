// src/components/posts/TextPostBackgroundSelector.tsx
'use client';

import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

interface TextPostBackgroundSelectorProps {
  selectedStyle: string;
  onSelectStyle: (style: string) => void;
}

const backgroundOptions = [
  { id: 'bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500', name: 'Sunset' },
  { id: 'bg-gradient-to-tr from-blue-700 via-blue-800 to-gray-900', name: 'Twilight' },
  { id: 'bg-gradient-to-tr from-green-300 via-blue-500 to-purple-600', name: 'Aurora' },
  { id: 'bg-gradient-to-tr from-rose-400 via-fuchsia-500 to-indigo-500', name: 'Vibrant' },
  { id: 'bg-gradient-to-tr from-gray-700 via-gray-900 to-black', name: 'Midnight' },
  { id: 'bg-card', name: 'Default' },
];

export default function TextPostBackgroundSelector({ selectedStyle, onSelectStyle }: TextPostBackgroundSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">Arka Plan Stili Seçin</p>
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {backgroundOptions.map(option => (
          <button
            key={option.id}
            type="button"
            onClick={() => onSelectStyle(option.id === 'bg-card' ? '' : option.id)}
            className={cn(
              "h-10 w-10 rounded-full border-2 flex-shrink-0 transition-all",
              selectedStyle === option.id || (selectedStyle === '' && option.id === 'bg-card') ? 'border-primary scale-110' : 'border-muted'
            )}
            aria-label={`Select ${option.name} background`}
          >
            <div className={cn("h-full w-full rounded-full flex items-center justify-center", option.id)}>
              {(selectedStyle === option.id || (selectedStyle === '' && option.id === 'bg-card')) && (
                 <CheckCircle className="h-5 w-5 text-white/80" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
