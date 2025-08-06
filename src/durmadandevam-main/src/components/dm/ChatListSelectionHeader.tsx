// src/components/dm/ChatListSelectionHeader.tsx
'use client';

import { Button } from "@/components/ui/button";
import { X, Pin, Trash2 } from "lucide-react";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ChatListSelectionHeaderProps {
    count: number;
    onClear: () => void;
    onPin: () => void;
    onDelete: () => void;
}

export default function ChatListSelectionHeader({ count, onClear, onPin, onDelete }: ChatListSelectionHeaderProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showPinConfirm, setShowPinConfirm] = useState(false);

    const handlePin = async () => {
        setIsProcessing(true);
        await onPin();
        setIsProcessing(false);
        setShowPinConfirm(false);
    }

    const handleDelete = async () => {
        setIsProcessing(true);
        await onDelete();
        setIsProcessing(false);
        setShowDeleteConfirm(false);
    }
    
    return (
        <>
            <div className="p-2 border-b bg-muted/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={onClear}>
                        <X className="h-5 w-5"/>
                    </Button>
                    <span className="font-semibold text-lg">{count}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setShowPinConfirm(true)}>
                        <Pin className="h-5 w-5"/>
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full text-destructive hover:text-destructive" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="h-5 w-5"/>
                    </Button>
                </div>
            </div>

            {/* Pin Confirmation */}
            <AlertDialog open={showPinConfirm} onOpenChange={setShowPinConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sohbetleri Sabitle?</AlertDialogTitle>
                        <AlertDialogDescription>Seçili {count} sohbeti listenin başına sabitlemek istediğinizden emin misiniz?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handlePin} disabled={isProcessing}>
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sabitle
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
            
            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Sohbetleri Sil?</AlertDialogTitle>
                        <AlertDialogDescription>Seçili {count} sohbeti gizlemek istediğinizden emin misiniz? Bu işlem sohbetleri kalıcı olarak silmez, sadece gelen kutunuzdan gizler.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isProcessing}>İptal</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} disabled={isProcessing} className="bg-destructive hover:bg-destructive/90">
                            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Sil
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
