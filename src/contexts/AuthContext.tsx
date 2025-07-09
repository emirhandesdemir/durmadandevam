// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, DocumentData, collection, query, where, updateDoc, serverTimestamp, setDoc, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { FeatureFlags, UserProfile, ThemeSettings } from '@/lib/types';
import { triggerProfileCompletionNotification } from '@/lib/actions/notificationActions';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  featureFlags: FeatureFlags | null;
  themeSettings: ThemeSettings | null;
  totalUnreadDms: number;
  loading: boolean;
  handleLogout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  featureFlags: null,
  themeSettings: null,
  totalUnreadDms: 0,
  loading: true,
  handleLogout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [totalUnreadDms, setTotalUnreadDms] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = useCallback(async () => {
    try {
        if (user) { 
            const userStatusRef = doc(db, 'users', user.uid);
            await setDoc(userStatusRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            }, { merge: true });
        }
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
  }, [user, toast]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Effect for general app config (features, theme) - runs once
  useEffect(() => {
    const featuresRef = doc(db, 'config', 'featureFlags');
    const unsubscribeFeatures = onSnapshot(featuresRef, (docSnap) => {
      setFeatureFlags(docSnap.exists() ? docSnap.data() as FeatureFlags : { quizGameEnabled: true, postFeedEnabled: true, contentModerationEnabled: true });
    });

    const themeRef = doc(db, 'config', 'theme');
    const unsubscribeTheme = onSnapshot(themeRef, (docSnap) => {
      if (docSnap.exists()) {
          setThemeSettings(docSnap.data() as ThemeSettings);
      }
    });
    
    return () => {
        unsubscribeFeatures();
        unsubscribeTheme();
    };
  }, []);


  // Effect for user-specific data (userData, DMs, presence)
  useEffect(() => {
    setFirestoreLoading(true);
    let unsubscribeUser: () => void = () => {};
    let unsubscribeDms: () => void = () => {};
    let unsubscribePresence: (() => void) | undefined = undefined;

    if (user) {
      // User Data Listener
      const userDocRef = doc(db, 'users', user.uid);
      unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
             if (data.isBanned) {
                toast({
                    variant: 'destructive',
                    title: 'Hesabınız Askıya Alındı',
                    description: 'Bu hesaba erişiminiz kısıtlanmıştır. Detaylar için destek ile iletişime geçin.',
                    duration: Infinity,
                });
                handleLogout();
                return;
            }
            setUserData(data);

            if (!data.bio && !data.profileCompletionNotificationSent) {
                triggerProfileCompletionNotification(user.uid);
            }
        } else {
            setUserData(null);
        }
        setFirestoreLoading(false);
      }, (error) => {
        console.error("Firestore user listener error:", error);
        setUserData(null);
        setFirestoreLoading(false);
      });

      // DM Listener
      const dmsQuery = query(
        collection(db, 'directMessagesMetadata'),
        where('participantUids', 'array-contains', user.uid)
      );
      unsubscribeDms = onSnapshot(dmsQuery, (snapshot) => {
        let total = 0;
        snapshot.forEach(doc => {
            const data = doc.data();
            total += data.unreadCounts?.[user.uid] || 0;
        });
        setTotalUnreadDms(total);
      });

      // Presence Management
      const userStatusRef = doc(db, 'users', user.uid);
      const updateStatus = (online: boolean) => {
          setDoc(userStatusRef, {
              isOnline: online,
              lastSeen: serverTimestamp()
          }, { merge: true }).catch(err => console.error("Presence update failed:", err));
      };
      
      updateStatus(true);
      const handleVisibilityChange = () => document.visibilityState === 'hidden' ? updateStatus(false) : updateStatus(true);
      const handleBeforeUnload = () => updateStatus(false);
      
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener('beforeunload', handleBeforeUnload);

      unsubscribePresence = () => {
          updateStatus(false);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
          window.removeEventListener('beforeunload', handleBeforeUnload);
      };

    } else {
      setUserData(null);
      setTotalUnreadDms(0);
      setFirestoreLoading(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeDms();
      if (unsubscribePresence) unsubscribePresence();
    };
  }, [user, handleLogout, toast]);

  // Effect for handling redirection logic
  useEffect(() => {
    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isOnboardingPage = pathname === '/onboarding';
    
    if (loading) return; // Wait until all loading is finished

    if (user && userData) { // User is logged in and has data
        if (!userData.bio && !isOnboardingPage) {
            router.replace('/onboarding');
        } else if (isAuthPage) {
            router.replace('/home');
        }
    } else if (!user && !isAuthPage) { // User is not logged in and not on an auth page
        router.replace('/login');
    }
  }, [user, userData, pathname, router, loading]);


  const loading = authLoading || firestoreLoading;
  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
