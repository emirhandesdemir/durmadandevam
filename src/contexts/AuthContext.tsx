// src/contexts/AuthContext.tsx
// Bu dosya, uygulama genelinde kullanıcı kimlik doğrulama durumunu (authentication state)
// yönetmek ve paylaşmak için bir React Context oluşturur.
// Firebase Auth'un anlık durumunu dinler ve kullanıcı bilgilerini sağlar.

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { FeatureFlags } from '@/lib/types';


// Context'in tip tanımı
interface AuthContextType {
  user: User | null;
  userData: DocumentData | null;
  featureFlags: FeatureFlags | null;
  loading: boolean;
  handleLogout: () => Promise<void>; // Çıkış fonksiyonu eklendi
}

// Context'in oluşturulması ve varsayılan değerleri
const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  featureFlags: null,
  loading: true,
  handleLogout: async () => {}, // Boş bir async fonksiyon
});


// Diğer bileşenleri sarmalayacak olan Provider bileşeni
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Step 1: Listen for auth state changes from Firebase.
  // This determines if there's a user or not.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Step 2: Listen for Firestore data. This effect depends on the user state.
  useEffect(() => {
    setFirestoreLoading(true);

    const featuresRef = doc(db, 'config', 'featureFlags');
    const unsubscribeFeatures = onSnapshot(featuresRef, (docSnap) => {
      setFeatureFlags(docSnap.exists() ? docSnap.data() as FeatureFlags : { quizGameEnabled: true, postFeedEnabled: true });
    });

    let unsubscribeUser: () => void = () => {};

    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        setUserData(docSnap.exists() ? docSnap.data() : null);
        setFirestoreLoading(false);
      }, (error) => {
        console.error("Firestore user listener error:", error);
        setUserData(null);
        setFirestoreLoading(false);
      });
    } else {
      // No user, so no user data to load.
      setUserData(null);
      setFirestoreLoading(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeFeatures();
    };
  }, [user]);

  // The overall loading state is true until both the auth state is known
  // and the subsequent firestore data has been loaded.
  const loading = authLoading || firestoreLoading;

  // Çıkış yapma fonksiyonu
  const handleLogout = useCallback(async () => {
    try {
        await signOut(auth);
        toast({
            title: "Oturum Kapatıldı",
            description: "Başarıyla çıkış yaptınız.",
        });
        window.location.href = '/login'; 
    } catch (error) {
        console.error("Logout error", error);
        toast({
            title: "Hata",
            description: "Çıkış yapılırken bir hata oluştu.",
            variant: "destructive",
        });
    }
  }, [toast]);


  // Context aracılığıyla paylaşılacak değerler
  const value = { user, userData, loading, handleLogout, featureFlags };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context'i kolayca kullanmak için özel bir hook
export const useAuth = () => {
  return useContext(AuthContext);
};
