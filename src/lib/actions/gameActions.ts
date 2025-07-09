// src/lib/actions/gameActions.ts
'use server';

import { db } from "@/lib/firebase";
import { 
    doc, 
    setDoc,
    getDoc,
} from "firebase/firestore";
import type { GameSettings } from "../types";
import { revalidatePath } from "next/cache";

// Ayarları almak için fonksiyon
export async function getGameSettings(): Promise<GameSettings> {
    const settingsRef = doc(db, 'config', 'gameSettings');
    const docSnap = await getDoc(settingsRef);
    const defaults: GameSettings = {
        dailyDiamondLimit: 50,
        afkTimeoutMinutes: 8,
        imageUploadQuality: 0.9,
        audioBitrate: 64,
        videoBitrate: 1000,
    };
    if (docSnap.exists()) {
        return { ...defaults, ...docSnap.data() };
    }
    return defaults;
}

// Ayarları güncellemek için fonksiyon
export async function updateGameSettings(settings: Partial<GameSettings>) {
    const settingsRef = doc(db, 'config', 'gameSettings');
    await setDoc(settingsRef, settings, { merge: true });
    revalidatePath('/admin/system');
}
