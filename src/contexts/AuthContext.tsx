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
  userData: DocumentData | null; // Firestore'dan gelen ek kullanıcı verileri (örn: rol)
  featureFlags: FeatureFlags | null; // Uygulama genelindeki özellik bayrakları
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
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setUserData(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let unsubscribeFirestore: () => void = () => {};
    let unsubscribeFeatures: () => void = () => {};
    
    // Özellik bayraklarını her zaman dinle
    const featuresRef = doc(db, 'config', 'featureFlags');
    unsubscribeFeatures = onSnapshot(featuresRef, (docSnap) => {
        setFeatureFlags(docSnap.exists() ? docSnap.data() as FeatureFlags : { quizGameEnabled: true, postFeedEnabled: true });
        // Kullanıcı bilgisi ve özellikler yüklendiğinde yüklemeyi bitir
        if (!user) setLoading(false);
    });

    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData(null);
        }
        // Kullanıcı bilgisi ve özellikler yüklendiğinde yüklemeyi bitir
        if (featureFlags !== null) setLoading(false);
      }, (error) => {
        console.error("Firestore user listener error:", error);
        setUserData(null);
        setLoading(false);
      });
    }

    return () => {
        unsubscribeFirestore();
        unsubscribeFeatures();
    };
  }, [user, featureFlags]);


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
