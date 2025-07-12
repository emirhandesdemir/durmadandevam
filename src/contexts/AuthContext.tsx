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
import i18n from '@/lib/i18n';

// localStorage'da saklanacak kullanıcı verisinin hafif versiyonu.
interface PersistedUser {
    uid: string;
    username: string;
    photoURL: string | null;
    email: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserProfile | null;
  featureFlags: FeatureFlags | null;
  themeSettings: ThemeSettings | null;
  totalUnreadDms: number;
  loading: boolean;
  persistedUsers: PersistedUser[];
  handleLogout: (options?: { removeAllAccounts?: boolean }) => Promise<void>;
  switchAccount: (targetUser: PersistedUser) => void;
  addPersistedUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  featureFlags: null,
  themeSettings: null,
  totalUnreadDms: 0,
  loading: true,
  persistedUsers: [],
  handleLogout: async () => {},
  switchAccount: () => {},
  addPersistedUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags | null>(null);
  const [themeSettings, setThemeSettings] = useState<ThemeSettings | null>(null);
  const [totalUnreadDms, setTotalUnreadDms] = useState(0);
  const [authLoading, setAuthLoading] = useState(true);
  const [firestoreLoading, setFirestoreLoading] = useState(true);
  const [persistedUsers, setPersistedUsers] = useState<PersistedUser[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const getPersistedUsers = (): PersistedUser[] => {
    try {
        const users = localStorage.getItem('HiweWalkAccounts');
        return users ? JSON.parse(users) : [];
    } catch {
        return [];
    }
  };

  const addPersistedUser = useCallback((userToAdd: User) => {
    const existingUsers = getPersistedUsers();
    if (!existingUsers.some(u => u.uid === userToAdd.uid)) {
        const newUser: PersistedUser = {
            uid: userToAdd.uid,
            username: userToAdd.displayName || 'Kullanıcı',
            photoURL: userToAdd.photoURL,
            email: userToAdd.email
        };
        const newUsers = [...existingUsers, newUser];
        localStorage.setItem('HiweWalkAccounts', JSON.stringify(newUsers));
        setPersistedUsers(newUsers);
    }
  }, []);

  useEffect(() => {
    setPersistedUsers(getPersistedUsers());
  }, []);

  const switchAccount = useCallback((targetUser: PersistedUser) => {
    toast({ description: `${targetUser.username} hesabına geçiş yapılıyor...`, duration: 2000 });
    signOut(auth).then(() => {
      // Yönlendirme ile e-postayı login sayfasına gönder.
      // Bu, Firebase'in oturumu şifresiz olarak yeniden kurmasını tetikler (eğer tarayıcıda kayıtlıysa).
      router.push(`/login?email=${encodeURIComponent(targetUser.email || '')}`);
    });
  }, [router, toast]);

  const handleLogout = useCallback(async (options?: { removeAllAccounts?: boolean }) => {
    try {
        if (user) { 
            const userStatusRef = doc(db, 'users', user.uid);
            await setDoc(userStatusRef, {
                isOnline: false,
                lastSeen: serverTimestamp()
            }, { merge: true });
        }
        await signOut(auth);

        const currentUsers = getPersistedUsers();
        const updatedUsers = options?.removeAllAccounts 
          ? [] 
          : currentUsers.filter(u => u.uid !== user?.uid);
          
        localStorage.setItem('HiweWalkAccounts', JSON.stringify(updatedUsers));
        setPersistedUsers(updatedUsers);

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
      if (currentUser) {
          addPersistedUser(currentUser);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [addPersistedUser]);

  useEffect(() => {
    setFirestoreLoading(true);
    let unsubscribeUser: () => void = () => {};
    let unsubscribeDms: () => void = () => {};
    let unsubscribePresence: (() => void) | undefined = undefined;

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
      const updateStatus = (online: boolean) => {
          setDoc(userStatusRef, { isOnline: online, lastSeen: serverTimestamp() }, { merge: true }).catch(err => console.error("Presence update failed:", err));
      };
      
      updateStatus(true);
      const handleVisibilityChange = () => document.visibilityState === 'hidden' ? updateStatus(false) : updateStatus(true);
      const handleBeforeUnload = () => updateStatus(false);
      window.addEventListener('beforeunload', handleBeforeUnload);
      document.addEventListener("visibilitychange", handleVisibilityChange);
      
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

  const loading = authLoading || firestoreLoading;

  const value = { user, userData, loading, handleLogout, featureFlags, themeSettings, totalUnreadDms, persistedUsers, switchAccount, addPersistedUser };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  return useContext(AuthContext);
};
