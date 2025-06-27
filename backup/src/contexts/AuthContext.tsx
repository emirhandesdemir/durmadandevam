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


// Context'in tip tanımı
interface AuthContextType {
  user: User | null;
  userData: DocumentData | null; // Firestore'dan gelen ek kullanıcı verileri (örn: rol)
  loading: boolean;
  handleLogout: () => Promise<void>; // Çıkış fonksiyonu eklendi
}

// Context'in oluşturulması ve varsayılan değerleri
const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  handleLogout: async () => {}, // Boş bir async fonksiyon
});


// Diğer bileşenleri sarmalayacak olan Provider bileşeni
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  // Firebase Auth durumundaki değişiklikleri dinleyen useEffect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        // Kullanıcı çıkış yapmışsa, verileri temizle ve yüklemeyi bitir
        setUserData(null);
        setLoading(false);
      }
      // Kullanıcı giriş yaptığında yükleme durumu, Firestore dinleyicisi tarafından yönetilecek.
    });
    // Component unmount olduğunda dinleyiciyi temizle
    return () => unsubscribe();
  }, []);

  // Firestore'daki kullanıcı belgesini gerçek zamanlı dinleyen useEffect
  useEffect(() => {
    let unsubscribeFirestore: () => void = () => {};

    if (user) {
      setLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribeFirestore = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        } else {
          setUserData(null);
        }
        setLoading(false);
      }, (error) => {
        console.error("Firestore user listener error:", error);
        setUserData(null);
        setLoading(false);
      });
    }

    // Component unmount olduğunda veya kullanıcı değiştiğinde dinleyiciyi temizle
    return () => unsubscribeFirestore();
  }, [user]); // Bu efekt, kullanıcı (login/logout) değiştiğinde yeniden çalışır.


  // Çıkış yapma fonksiyonu
  const handleLogout = useCallback(async () => {
    try {
        await signOut(auth);
        toast({
            title: "Oturum Kapatıldı",
            description: "Başarıyla çıkış yaptınız.",
        });
        // Kullanıcıyı login sayfasına yönlendir.
        // `window.location` kullanmak, state'lerin tamamen sıfırlanmasını sağlar.
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
  const value = { user, userData, loading, handleLogout };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context'i kolayca kullanmak için özel bir hook
export const useAuth = () => {
  return useContext(AuthContext);
};
