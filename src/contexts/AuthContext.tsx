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
import { usePathname, useRouter } from 'next/navigation';

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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = useCallback(async () => {
    try {
        if (auth.currentUser) { 
            const userStatusRef = doc(db, 'users', auth.currentUser.uid);
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
      if (!currentUser) {
        setLoading(false); // If no user, stop loading immediately
      }
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
            setLoading(false); // Stop loading after user data is fetched
        }, (error) => {
            console.error("Firestore user listener error:", error);
            setUserData(null);
            setLoading(false);
        });

        const dmsQuery = query(collection(db, 'directMessagesMetadata'), where('participantUids', 'array-contains', user.uid));
        unsubscribeDms = onSnapshot(dmsQuery, (snapshot) => {
            let total = 0;
            snapshot.forEach(doc => { total += doc.data().unreadCounts?.[user.uid] || 0; });
            setTotalUnreadDms(total);
        });
        
        // Presence management
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
    }
  }, [user, handleLogout, toast]);

  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms };

  // Handle redirection based on auth state
  useEffect(() => {
    if (!loading) {
        const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/privacy' || pathname === '/terms';
        if (user && isAuthPage) {
            router.replace('/home');
        } else if (!user && !isAuthPage) {
            router.replace(`/login?redirect=${pathname}`);
        }
    }
  }, [user, loading, pathname, router]);

  // Show a loader while authentication is in progress.
  if (loading) {
    const isAuthPage = pathname === '/login' || pathname === '/signup';
    return <AnimatedLogoLoader fullscreen isAuthPage={isAuthPage} />;
  }

  // Prevent rendering children if user is not logged in and not on an auth page
  if (!user && (pathname !== '/login' && pathname !== '/signup' && pathname !== '/privacy' && pathname !== '/terms')) {
      return <AnimatedLogoLoader fullscreen />;
  }
  
  // Prevent rendering children if user is logged in and on an auth page
  if(user && (pathname === '/login' || pathname === '/signup')) {
      return <AnimatedLogoLoader fullscreen />;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
