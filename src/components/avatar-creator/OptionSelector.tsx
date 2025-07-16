// src/components/avatar-creator/OptionSelector.tsx
'use client';

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Option } from "./types";

interface OptionSelectorProps {
    options: Option[];
    selectedValue: string;
    onValueChange: (value: string) => void;
}

export default function OptionSelector({ options, selectedValue, onValueChange }: OptionSelectorProps) {
    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {options.map(option => (
                <Card 
                    key={option.id}
                    onClick={() => onValueChange(option.id)}
                    className={cn(
                        "cursor-pointer transition-all",
                        selectedValue === option.id ? "border-primary ring-2 ring-primary" : "hover:bg-accent"
                    )}
                >
                    <CardContent className="p-2 flex flex-col items-center justify-center gap-2 aspect-square">
                        <div className="h-12 w-12 flex items-center justify-center bg-muted rounded-md text-muted-foreground">
                            {option.icon ? <option.icon className="h-8 w-8"/> : <span className="text-xs">?</span>}
                        </div>
                        <span className="text-xs font-semibold text-center">{option.name}</span>
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}
