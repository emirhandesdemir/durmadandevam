// src/lib/actions/authActions.ts
'use server';

import { getAuth } from "firebase-admin/auth";
import { revalidatePath } from "next/cache";

export async function changePassword(uid: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!uid || !newPassword) {
        return { success: false, error: "Kullanıcı ID ve yeni şifre gereklidir." };
    }
    if (newPassword.length < 6) {
        return { success: false, error: "Şifre en az 6 karakter olmalıdır." };
    }

    try {
        const auth = getAuth();
        await auth.updateUser(uid, {
            password: newPassword,
        });
        // This is a server-side action, revalidation might not be necessary
        // unless you display something related to the password change time.
        return { success: true };
    } catch (error: any) {
        console.error("Şifre güncellenirken hata:", error);
        return { success: false, error: error.message || "Şifre güncellenemedi." };
    }
}
