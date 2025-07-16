'use client';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';

interface OptionSelectorProps {
  options: { id: string; label: string }[];
  selectedOption: string;
  onSelect: (optionId: string) => void;
  renderPreview: (optionId: string) => React.ReactNode;
}

export default function OptionSelector({ options, selectedOption, onSelect, renderPreview }: OptionSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onSelect(option.id)}
          className={cn(
            'rounded-xl border-2 bg-muted/50 p-2 text-center transition-all aspect-square flex flex-col items-center justify-center gap-2 hover:bg-accent',
            selectedOption === option.id ? 'border-primary' : 'border-transparent'
          )}
        >
          <div className="w-16 h-16 flex items-center justify-center">
            {renderPreview(option.id)}
          </div>
          <span className="text-xs font-semibold">{option.label}</span>
        </button>
      ))}
    </div>
  );
}
