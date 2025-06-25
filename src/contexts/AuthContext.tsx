// src/contexts/AuthContext.tsx
// Bu dosya, uygulama genelinde kullanıcı kimlik doğrulama durumunu (authentication state)
// yönetmek ve paylaşmak için bir React Context oluşturur.
// Firebase Auth'un anlık durumunu dinler ve kullanıcı bilgilerini sağlar.

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, getDoc, DocumentData } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { Loader2 } from 'lucide-react';
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
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Kullanıcı giriş yapmışsa, Firestore'dan ek verilerini çek
        const userDocRef = doc(db, 'users', currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setUserData(userDocSnap.data());
        } else {
          setUserData(null);
        }
      } else {
        // Kullanıcı çıkış yapmışsa, ek verileri temizle
        setUserData(null);
      }
      setLoading(false); // Yükleme tamamlandı
    });

    // Component unmount olduğunda dinleyiciyi temizle
    return () => unsubscribe();
  }, []);

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

  // Veri yüklenirken tam ekran bir yükleme göstergesi göster
  if (loading && typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Context'i kolayca kullanmak için özel bir hook
export const useAuth = () => {
  return useContext(AuthContext);
};
