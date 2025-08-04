// src/contexts/AuthContext.tsx
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onIdTokenChanged, User, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import type { FeatureFlags, UserProfile, ThemeSettings } from '@/lib/types';
import { assignMissingUniqueTag } from '@/lib/actions/userActions';
import { triggerProfileCompletionNotification } from '@/lib/actions/notificationActions';
import i18n from '@/lib/i18n';
import AnimatedLogoLoader from '@/components/common/AnimatedLogoLoader';
import { collection, query, where } from 'firebase/firestore';
import { usePathname, useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  featureFlags: FeatureFlags | null;
  themeSettings: ThemeSettings | null;
  totalUnreadDms: number;
  loading: boolean;
  handleLogout: (isBan?: boolean) => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  featureFlags: null,
  themeSettings: null,
  totalUnreadDms: 0,
  loading: true,
  handleLogout: async () => {},
  refreshUserData: async () => {},
});

async function setSessionCookie(idToken: string | null) {
  if (idToken) {
    await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
  } else {
    await fetch('/api/auth/session', { method: 'DELETE' });
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [totalUnreadDms, setTotalUnreadDms] = useState(0);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = useCallback(async (isBan: boolean = false) => {
    try {
        if (auth.currentUser) { 
            const userStatusRef = doc(db, 'users', auth.currentUser.uid);
            await setDoc(userStatusRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
        }
        if (isBan) {
          localStorage.setItem('isBanned', 'true');
        }
        await signOut(auth);
        await setSessionCookie(null);
        router.push('/login'); // Force redirect to login on logout
    } catch (error) {
        console.error("Logout error", error);
        toast({
            title: "Hata",
            description: "Çıkış yapılırken bir hata oluştu.",
            variant: "destructive",
        });
    }
  }, [toast, router]);
  
  const refreshUserData = useCallback(async () => {
    if (!auth.currentUser) return;
    try {
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
            setUserData(docSnap.data() as UserProfile);
        }
    } catch (error) {
        console.error("Error manually refreshing user data:", error);
    }
  }, []);

  useEffect(() => {
    const unsubscribeFeatures = onSnapshot(doc(db, 'config', 'featureFlags'), (docSnap) => {
      setFeatureFlags(docSnap.exists() ? docSnap.data() as FeatureFlags : { quizGameEnabled: true, contentModerationEnabled: true });
    });

    const unsubscribeTheme = onSnapshot(doc(db, 'config', 'theme'), (docSnap) => {
      if (docSnap.exists()) setThemeSettings(docSnap.data() as ThemeSettings);
    });

    const unsubscribeAuth = onIdTokenChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeFeatures();
      unsubscribeTheme();
    };
  }, []);

  useEffect(() => {
    if (user === undefined) {
      return; 
    }

    if (!user) {
      setUserData(null);
      setTotalUnreadDms(0);
      setLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    const unsubscribeUser = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        if (data.isBanned) {
          handleLogout(true);
          return;
        }
        if (!data.uniqueTag) {
            assignMissingUniqueTag(user.uid).catch(console.error);
        }
        setUserData(data);
        if (data.language && i18n.language !== data.language) {
            i18n.changeLanguage(data.language);
        }
        if (!data.bio && !data.profileCompletionNotificationSent) {
            triggerProfileCompletionNotification(user.uid);
        }
        setLoading(false);
      } else {
        // User is authenticated, but their document doesn't exist yet.
        // This is a normal state during the very first moments of signup.
        // We keep loading until the document is created by the `updateUserProfile` action.
        console.log("Waiting for user document to be created...");
        setLoading(true);
      }
    }, (error) => {
      console.error("Firestore user listener error:", error);
      handleLogout();
    });

    const dmsQuery = query(collection(db, 'directMessagesMetadata'), where('participantUids', 'array-contains', user.uid));
    const unsubscribeDms = onSnapshot(dmsQuery, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => { total += doc.data().unreadCounts?.[user.uid] || 0; });
      setTotalUnreadDms(total);
    });
    
    setDoc(userDocRef, { isOnline: true }, { merge: true });
    
    const onbeforeunload = () => setDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }, { merge: true });
    window.addEventListener("beforeunload", onbeforeunload);
    
    return () => {
      unsubscribeUser();
      unsubscribeDms();
      window.removeEventListener("beforeunload", onbeforeunload);
    };
  }, [user, handleLogout]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');
    const isPublicPage = isAuthPage || pathname.startsWith('/guide') || pathname.startsWith('/terms') || pathname.startsWith('/privacy');

    if (!user && !isPublicPage) {
      router.replace('/login');
    } else if (user && userData && isAuthPage) {
      router.replace('/home');
    }
  }, [user, userData, loading, pathname, router]);

  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms, refreshUserData };
  
  return (
      <AuthContext.Provider value={value}>
        {children}
      </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
