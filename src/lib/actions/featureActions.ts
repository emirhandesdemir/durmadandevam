// src/lib/actions/featureActions.ts
'use server';

import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import type { FeatureFlags } from '../types';

/**
 * Mevcut özellik bayraklarını Firestore'dan alır.
 * @returns {Promise<FeatureFlags>} Özellik bayraklarının bir nesnesi.
 */
export async function getFeatureFlags(): Promise<FeatureFlags> {
    const flagsRef = doc(db, 'config', 'featureFlags');
    const docSnap = await getDoc(flagsRef);

    // Varsayılan değerler. postFeedEnabled her zaman true olacak.
    const defaultFlags: FeatureFlags = {
        quizGameEnabled: true,
        contentModerationEnabled: true,
    };

    if (docSnap.exists()) {
        // Firestore'dan gelen verilerle varsayılanları birleştir.
        return { ...defaultFlags, ...docSnap.data() };
    }

    return defaultFlags;
}

/**
 * Özellik bayraklarını Firestore'da günceller.
 * @param {Partial<FeatureFlags>} flags Güncellenecek özellik bayrakları.
 * @returns {Promise<{success: boolean, error?: string}>} İşlemin başarı durumunu döner.
 */
export async function updateFeatureFlags(flags: Partial<FeatureFlags>) {
    const flagsRef = doc(db, 'config', 'featureFlags');
    try {
        await setDoc(flagsRef, flags, { merge: true });
        // Admin panelini ve ilgili sayfaları yeniden doğrula
        revalidatePath('/admin/features');
        revalidatePath('/(main)', 'layout');
        return { success: true };
    } catch (error: any) {
        console.error("Özellik bayrakları güncellenirken hata oluştu:", error);
        return { success: false, error: error.message };
    }
}
