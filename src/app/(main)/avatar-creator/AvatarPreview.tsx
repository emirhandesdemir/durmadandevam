// src/app/(main)/avatar-studio/page.tsx
'use client';

import { useState, useCallback, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Sparkles, Wand2, RefreshCw, Bot, Loader2 } from 'lucide-react';
import { generateAvatar, type GenerateAvatarInput } from '@/ai/flows/generateAvatarFlow';
import { styleAvatar, type StyleAvatarInput } from '@/ai/flows/styleAvatarFlow';
import { updateUserProfile } from '@/lib/actions/userActions';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

type AvatarState = {
  baseAvatar: string | null;
  currentAvatar: string | null;
  history: string[];
  historyIndex: number;
  prompt: string;
};

type AvatarAction =
  | { type: 'SET_AVATAR'; payload: string }
  | { type: 'SET_PROMPT'; payload: string }
  | { type: 'START_EDIT'; payload: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET' };

const initialState: AvatarState = {
  baseAvatar: null,
  currentAvatar: null,
  history: [],
  historyIndex: -1,
  prompt: '',
};

function avatarReducer(state: AvatarState, action: AvatarAction): AvatarState {
  switch (action.type) {
    case 'SET_AVATAR':
      const newHistory = [action.payload];
      return {
        ...state,
        baseAvatar: action.payload,
        currentAvatar: action.payload,
        history: newHistory,
        historyIndex: 0,
        prompt: '',
      };
    case 'START_EDIT':
      const truncatedHistory = state.history.slice(0, state.historyIndex + 1);
      const updatedHistory = [...truncatedHistory, action.payload];
      return {
        ...state,
        currentAvatar: action.payload,
        history: updatedHistory,
        historyIndex: updatedHistory.length - 1,
        prompt: '',
      };
    case 'UNDO':
        if (state.historyIndex > 0) {
            const newIndex = state.historyIndex - 1;
            return {
                ...state,
                historyIndex: newIndex,
                currentAvatar: state.history[newIndex],
            };
        }
        return state;
    case 'REDO':
        if (state.historyIndex < state.history.length - 1) {
            const newIndex = state.historyIndex + 1;
            return {
                ...state,
                historyIndex: newIndex,
                currentAvatar: state.history[newIndex],
            };
        }
        return state;
    case 'RESET':
        return {
            ...state,
            currentAvatar: state.baseAvatar,
            history: state.baseAvatar ? [state.baseAvatar] : [],
            historyIndex: state.baseAvatar ? 0 : -1,
        }
    case 'SET_PROMPT':
      return { ...state, prompt: action.payload };
    default:
      return state;
  }
}

export default function AvatarStudioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [state, dispatch] = useReducer(avatarReducer, initialState);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  const handleGenerate = useCallback(async (basePrompt: string) => {
    setIsLoading(true);
    try {
      const input: GenerateAvatarInput = {
        prompt: basePrompt,
      };
      const result = await generateAvatar(input);
      if (result.avatarDataUri) {
        dispatch({ type: 'SET_AVATAR', payload: result.avatarDataUri });
      } else {
        throw new Error('Avatar oluşturulamadı.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Hata', description: error.message });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  const handleStyle = useCallback(async () => {
    if (!state.currentAvatar || !state.prompt) return;
    setIsLoading(true);
    try {
      const input: StyleAvatarInput = {
        avatarDataUri: state.currentAvatar,
        prompt: state.prompt,
      };
      const result = await styleAvatar(input);
       if (result.styledAvatarDataUri) {
        dispatch({ type: 'START_EDIT', payload: result.styledAvatarDataUri });
      } else {
        throw new Error('Avatar stilize edilemedi.');
      }
    } catch (error: any) {
        toast({ variant: 'destructive', title: 'Hata', description: error.message });
    } finally {
        setIsLoading(false);
    }
  }, [state.currentAvatar, state.prompt, toast]);

  const handleSave = async () => {
    if (!user || !state.currentAvatar) {
        toast({ variant: 'destructive', description: 'Kaydedilecek bir avatar bulunamadı.' });
        return;
    }
    setIsSaving(true);
    try {
        await updateUserProfile({ userId: user.uid, photoURL: state.currentAvatar });
        toast({ description: "Avatar başarıyla kaydedildi!" });
        router.back();
    } catch (error: any) {
        toast({ variant: 'destructive', description: `Hata: ${error.message}` });
    } finally {
        setIsSaving(false);
    }
  };
  
  const renderInitialState = () => (
    <div className="flex flex-col items-center justify-center text-center p-8 h-full">
        <div className="p-4 bg-primary/10 rounded-full mb-4">
            <Bot className="h-12 w-12 text-primary"/>
        </div>
      <h2 className="text-xl font-bold">Avatar Stüdyosuna Hoş Geldin!</h2>
      <p className="text-muted-foreground mt-2 mb-6">Hayalindeki avatarı metinle tarif etmeye başla.</p>
      <div className="w-full max-w-sm space-y-4">
        <Button className="w-full" onClick={() => handleGenerate("A full-body 3D character of a man with short brown hair, a friendly expression, wearing a simple t-shirt and jeans, on a plain background, modern cartoon style.")}>
          Erkek Model Oluştur
        </Button>
        <Button className="w-full" onClick={() => handleGenerate("A full-body 3D character of a woman with long black hair, a friendly expression, wearing a simple t-shirt and jeans, on a plain background, modern cartoon style.")}>
          Kadın Model Oluştur
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      <header className="p-2 flex items-center justify-between border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => router.back()} disabled={isLoading || isSaving}>
          <ArrowLeft />
        </Button>
        <h1 className="text-lg font-semibold">Avatar Stüdyosu</h1>
        <Button onClick={handleSave} disabled={!state.currentAvatar || isLoading || isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Save className="mr-2 h-4 w-4" />}
          Kaydet
        </Button>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/20 relative overflow-hidden">
             <AnimatePresence>
                {state.currentAvatar ? (
                    <motion.div
                        key={state.currentAvatar}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        className="relative w-full h-full"
                    >
                        <Image src={state.currentAvatar} alt="Avatar Preview" layout="fill" objectFit="contain" />
                    </motion.div>
                ) : (
                   !isLoading && renderInitialState()
                )}
            </AnimatePresence>
             {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-20">
                    <Loader2 className="h-12 w-12 text-white animate-spin"/>
                    <p className="text-white font-semibold">Avatar oluşturuluyor...</p>
                </div>
            )}
        </div>
        
        <div className="p-4 border-t shrink-0 space-y-3">
             <div className="flex items-center justify-center gap-2">
                <Button variant="outline" size="icon" onClick={() => dispatch({ type: 'UNDO' })} disabled={!canUndo || isLoading}><RefreshCw className="h-4 w-4 transform -scale-x-100" /></Button>
                <Button variant="outline" size="icon" onClick={() => dispatch({ type: 'REDO' })} disabled={!canRedo || isLoading}><RefreshCw className="h-4 w-4" /></Button>
                 <Button variant="outline" onClick={() => dispatch({ type: 'RESET' })} disabled={!state.baseAvatar || isLoading}>Sıfırla</Button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleStyle(); }} className="flex gap-2">
                 <Input
                    placeholder='örn: "siyah deri ceket giydir", "gözlük ekle"'
                    value={state.prompt}
                    onChange={(e) => dispatch({ type: 'SET_PROMPT', payload: e.target.value })}
                    disabled={!state.currentAvatar || isLoading}
                />
                <Button type="submit" disabled={!state.currentAvatar || isLoading || !state.prompt.trim()}>
                    <Wand2 className="mr-2 h-4 w-4" /> Stil Ver
                </Button>
            </form>
        </div>
      </div>
    </div>
  );
}