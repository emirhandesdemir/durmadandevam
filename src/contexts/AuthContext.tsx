// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, query, where, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { FeatureFlags, UserProfile, ThemeSettings } from '@/lib/types';
import { triggerProfileCompletionNotification } from '@/lib/actions/notificationActions';
import i18n from '@/lib/i18n';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { useRouter } from 'next/navigation';

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
  const { toast } = useToast();
  const router = useRouter();


  const handleLogout = useCallback(async () => {
    const userToLogout = auth.currentUser;
    try {
        if (userToLogout) {
            const userStatusRef = doc(db, 'users', userToLogout.uid);
            await setDoc(userStatusRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
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
  }, [toast]);
  
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });

    const unsubscribeFeatures = onSnapshot(doc(db, 'config', 'featureFlags'), (docSnap) => {
      setFeatureFlags(docSnap.exists() ? docSnap.data() as FeatureFlags : { quizGameEnabled: true, contentModerationEnabled: true });
    });

    const unsubscribeTheme = onSnapshot(doc(db, 'config', 'theme'), (docSnap) => {
      if (docSnap.exists()) setThemeSettings(docSnap.data() as ThemeSettings);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFeatures();
      unsubscribeTheme();
    };
  }, []);

  useEffect(() => {
    let unsubscribeUser: () => void = () => {};
    let unsubscribeDms: () => void = () => {};

    if (user) {
        setFirestoreLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data() as UserProfile;
                if (data.isBanned) {
                    toast({ variant: 'destructive', title: 'Hesabınız Askıya Alındı', description: 'Bu hesaba erişiminiz kısıtlanmıştır.', duration: Infinity });
                    handleLogout();
                    return;
                }
                setUserData(data);
                if (data.language && i18n.language !== data.language) {
                    i18n.changeLanguage(data.language);
                }
                if (!data.bio && !data.profileCompletionNotificationSent) {
                    triggerProfileCompletionNotification(user.uid);
                }
            } else { setUserData(null); }
            setFirestoreLoading(false);
        }, (error) => {
            console.error("Firestore user listener error:", error);
            setUserData(null);
            setFirestoreLoading(false);
        });

        const dmsQuery = query(collection(db, 'directMessagesMetadata'), where('participantUids', 'array-contains', user.uid));
        unsubscribeDms = onSnapshot(dmsQuery, (snapshot) => {
            let total = 0;
            snapshot.forEach(doc => { total += doc.data().unreadCounts?.[user.uid] || 0; });
            setTotalUnreadDms(total);
        });

        const userStatusRef = doc(db, 'users', user.uid);
        setDoc(userStatusRef, { isOnline: true }, { merge: true });
        const onbeforeunload = () => setDoc(userStatusRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        window.addEventListener("beforeunload", onbeforeunload);

        return () => {
            unsubscribeUser();
            unsubscribeDms();
            window.removeEventListener("beforeunload", onbeforeunload);
        };
    } else {
      setUserData(null);
      setTotalUnreadDms(0);
      setFirestoreLoading(false);
    }
  }, [user, handleLogout, toast]);

  const loading = authLoading || firestoreLoading;

  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms };

  if (loading) {
    return <AnimatedLogoLoader fullscreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
