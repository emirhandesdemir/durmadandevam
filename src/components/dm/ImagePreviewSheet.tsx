// src/components/dm/ImagePreviewSheet.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Timer, Loader2, Undo2, Palette, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { sendMessage } from '@/lib/actions/dmActions';
import { useToast } from '@/hooks/use-toast';
import type { UserInfo } from './DMChat';

interface ImagePreviewSheetProps {
  file: File | null;
  setFile: (file: File | null) => void;
  chatId: string;
  sender: UserInfo;
  receiver: UserInfo;
}

const drawingColors = [
    '#FFFFFF', '#EF4444', '#3B82F6', '#22C55E', '#EAB308', '#A855F7'
];

export default function ImagePreviewSheet({ file, setFile, chatId, sender, receiver }: ImagePreviewSheetProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [caption, setCaption] = useState('');
    const [imageType, setImageType] = useState<'permanent' | 'timed'>('permanent');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [drawingColor, setDrawingColor] = useState(drawingColors[0]);
    const [history, setHistory] = useState<ImageData[]>([]);
    
    const drawOnCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !file) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        img.onload = () => {
            const maxWidth = window.innerWidth;
            const maxHeight = window.innerHeight;
            let ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
            if (img.width * ratio > 800) {
                ratio = 800 / img.width;
            }
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            setHistory([ctx.getImageData(0, 0, canvas.width, canvas.height)]);
        };
    }, [file]);

    useEffect(() => {
        if(file){
            drawOnCanvas();
        }
    }, [file, drawOnCanvas]);

    const handleDrawingStart = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        setIsDrawing(true);
        ctx.strokeStyle = drawingColor;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        const pos = getMousePos(canvas, e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
    };

    const handleDrawingMove = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        e.preventDefault();
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const pos = getMousePos(canvas, e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    };

    const handleDrawingEnd = () => {
        if (!isDrawing) return;
        setIsDrawing(false);
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.closePath();
        setHistory(prev => [...prev, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
    };
    
    const handleUndo = () => {
        if (history.length <= 1) return; 
        
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const newHistory = history.slice(0, -1);
        const lastState = newHistory[newHistory.length - 1];
        ctx.putImageData(lastState, 0, 0);
        setHistory(newHistory);
    };

    const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const rect = canvas.getBoundingClientRect();
        if ('touches' in e) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top,
            };
        }
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    };

    const handleClose = () => {
        setFile(null);
        setCaption('');
        setHistory([]);
    };

    const handleSend = async () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        setIsSubmitting(true);
        
        try {
            const base64Image = canvas.toDataURL('image/jpeg', 0.9);
            await sendMessage(chatId, sender, receiver, { text: caption, imageUrl: base64Image, imageType });
            handleClose();
        } catch (error: any) {
            toast({ variant: 'destructive', description: `Fotoğraf gönderilemedi: ${error.message}` });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Sheet open={!!file} onOpenChange={(open) => !open && handleClose()}>
            <SheetContent side="bottom" className="h-full w-full p-0 bg-black flex flex-col justify-between gap-0">
                 {/* Header Controls */}
                <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full bg-black/50 text-white" onClick={handleClose}>
                        <X />
                    </Button>
                </div>
                 <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
                     <div className="p-1.5 rounded-2xl bg-black/50 backdrop-blur-sm flex flex-col gap-1.5">
                        {drawingColors.map(color => (
                            <button key={color} onClick={() => setDrawingColor(color)} className={cn("h-7 w-7 rounded-full border-2", drawingColor === color ? 'border-white' : 'border-transparent')} style={{ backgroundColor: color }} />
                        ))}
                    </div>
                     <Button onClick={handleUndo} variant="secondary" size="icon" className="h-10 w-10 rounded-full bg-black/50 border-white/20">
                        <Undo2 />
                    </Button>
                </div>
               
                {/* Canvas Area */}
                <div className="flex-1 flex items-center justify-center relative touch-none">
                   <canvas
                        ref={canvasRef}
                        className="max-w-full max-h-full"
                        onMouseDown={handleDrawingStart}
                        onMouseMove={handleDrawingMove}
                        onMouseUp={handleDrawingEnd}
                        onMouseLeave={handleDrawingEnd}
                        onTouchStart={handleDrawingStart}
                        onTouchMove={handleDrawingMove}
                        onTouchEnd={handleDrawingEnd}
                    />
                </div>

                {/* Footer Controls */}
                <div className="p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent space-y-3 shrink-0">
                    <div className="flex items-center gap-3">
                        <Input
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            placeholder="Başlık ekleyin..."
                            className="flex-1 bg-gray-800/80 border-gray-700 text-white placeholder:text-gray-400 rounded-full h-11 px-4"
                        />
                         <Button
                            variant="secondary"
                            size="icon"
                            className={cn(
                                "rounded-full h-11 w-11 flex-shrink-0 transition-colors bg-gray-800/80 text-white",
                                imageType === 'timed' && 'bg-primary text-primary-foreground'
                            )}
                            onClick={() => setImageType(prev => prev === 'timed' ? 'permanent' : 'timed')}
                        >
                            <Timer />
                        </Button>
                    </div>
                    <Button onClick={handleSend} disabled={isSubmitting} size="lg" className="w-full bg-primary h-12 rounded-xl text-lg">
                        {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin" /> : 'Gönder'}
                    </Button>
                </div>
            </SheetContent>
        </Sheet>
    );
}
