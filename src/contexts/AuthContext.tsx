
// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, DocumentData, collection, query, where, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { FeatureFlags, UserProfile, ThemeSettings } from '@/lib/types';
import { triggerProfileCompletionNotification } from '@/lib/actions/notificationActions';
import PremiumWelcomeManager from '@/components/common/PremiumWelcomeManager';


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
        // The onAuthStateChanged listener will trigger the OneSignal logout
        // via the useEffect in NotificationPermissionManager.
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

  // Presence Management
  useEffect(() => {
    if (!user || !userData) return;
    
    const userStatusRef = doc(db, 'users', user.uid);
    
    if (userData.showOnlineStatus === false) {
      setDoc(userStatusRef, { isOnline: false }, { merge: true });
      return; 
    }

    const updateStatus = (online: boolean) => {
        setDoc(userStatusRef, {
            isOnline: online,
            lastSeen: serverTimestamp()
        }, { merge: true }).catch(err => console.error("Presence update failed:", err));
    };
    
    updateStatus(true);
    const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            updateStatus(false);
        } else {
            updateStatus(true);
        }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    const handleBeforeUnload = () => {
        updateStatus(false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
        updateStatus(false);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, userData]); // Rerun when userData (including showOnlineStatus) changes


  useEffect(() => {
    setFirestoreLoading(true);

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

    let unsubscribeUser: () => void = () => {};
    let unsubscribeDms: () => void = () => {};

    if (user) {
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

    } else {
      setUserData(null);
      setTotalUnreadDms(0);
      setFirestoreLoading(false);
    }

    return () => {
      unsubscribeUser();
      unsubscribeFeatures();
      unsubscribeDms();
      unsubscribeTheme();
    };
  }, [user, handleLogout, toast]);

  const loading = authLoading || firestoreLoading;

  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms };

  return (
    <AuthContext.Provider value={value}>
        <PremiumWelcomeManager />
        {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
