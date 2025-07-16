// src/app/(main)/avatar-creator/OptionSelector.tsx
'use client';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface OptionSelectorProps {
    title: string;
    options: { id: string; label: string }[];
    selectedOption: string;
    onOptionSelect: (id: string) => void;
}

export default function OptionSelector({ title, options, selectedOption, onOptionSelect }: OptionSelectorProps) {
    return (
        <div className="space-y-2">
            <h3 className="font-semibold">{title}</h3>
            <RadioGroup value={selectedOption} onValueChange={onOptionSelect} className="grid grid-cols-2 gap-2">
                {options.map(option => (
                    <Label
                        key={option.id}
                        htmlFor={option.id}
                        className="flex items-center justify-center p-3 rounded-lg border cursor-pointer hover:bg-accent has-[:checked]:border-primary has-[:checked]:bg-accent"
                    >
                        <RadioGroupItem value={option.id} id={option.id} className="sr-only" />
                        {option.label}
                    </Label>
                ))}
            </RadioGroup>
        </div>
    );
}
