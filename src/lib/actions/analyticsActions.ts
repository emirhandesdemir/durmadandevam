// src/lib/actions/analyticsActions.ts
'use server';

import { db } from '@/lib/firebase';
import { collection, collectionGroup, getDocs, query, where, Timestamp, getCountFromServer, orderBy, limit } from 'firebase/firestore';
import { format, sub, startOfDay, endOfDay, getDay, getMonth, getYear } from 'date-fns';
import { tr } from 'date-fns/locale';
import type { Post, UserProfile } from '../types';
import { deepSerialize } from '../server-utils';


/**
 * Son 6 aydaki kullanıcı artışını hesaplar.
 */
export async function getUserGrowthData() {
    const sixMonthsAgo = sub(new Date(), { months: 6 });
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('createdAt', '>=', Timestamp.fromDate(sixMonthsAgo)));
    const snapshot = await getDocs(q);

    const monthlyData: { [key: string]: number } = {};

    snapshot.forEach(doc => {
        const userData = doc.data();
        if (userData.createdAt) {
            const createdAtDate = (userData.createdAt as Timestamp).toDate();
            const monthKey = format(createdAtDate, 'yyyy-MM');
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
    });

    // Son 6 ayın her ayı için bir girdi oluştur
    const result = Array.from({ length: 6 }).map((_, i) => {
        const d = sub(new Date(), { months: 5 - i });
        const monthKey = format(d, 'yyyy-MM');
        return {
            month: format(d, 'MMM', { locale: tr }),
            users: monthlyData[monthKey] || 0,
        };
    });

    return result;
}

/**
 * Son 7 gündeki gönderi ve yorum sayılarını hesaplar.
 */
export async function getContentCreationData() {
    const dayLabels = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
    const dailyData: { [key: number]: { posts: number; comments: number } } = {};
    for (let i = 0; i < 7; i++) {
        dailyData[i] = { posts: 0, comments: 0 };
    }

    const sevenDaysAgo = sub(new Date(), { days: 7 });

    // Son 7 güne ait gönderileri çek
    const postsRef = collection(db, 'posts');
    const postsQuery = query(postsRef, where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)));
    const postsSnapshot = await getDocs(postsQuery);
    
    // Gönderileri ve yorum sayılarını işle
    postsSnapshot.forEach(doc => {
        const post = doc.data() as Post;
        if (post.createdAt) {
            // Timestamp'i Date objesine çevir
            const createdAtDate = (post.createdAt instanceof Timestamp)
                ? post.createdAt.toDate()
                : new Date(post.createdAt.seconds * 1000);

            const dayIndex = getDay(createdAtDate);
            dailyData[dayIndex].posts++;
            dailyData[dayIndex].comments += (post.commentCount || 0); // Yorum sayısını ekle
        }
    });

    const result = Array.from({ length: 7 }).map((_, i) => {
       const d = sub(new Date(), { days: 6 - i });
       const dayIndex = getDay(d);
       return {
           name: dayLabels[dayIndex],
           ...dailyData[dayIndex],
       }
    });
    
    return result;
}

/**
 * Son 24 saatteki oda oluşturma aktivitesini saatlik olarak hesaplar.
 */
export async function getRoomActivityData() {
    const hourlyData: { [key: string]: number } = {};

    const twentyFourHoursAgo = sub(new Date(), { hours: 24 });
    const roomsRef = collection(db, 'rooms');
    const q = query(roomsRef, where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)));
    const snapshot = await getDocs(q);

    snapshot.forEach(doc => {
        const roomData = doc.data();
        if (roomData.createdAt) {
            const hour = format((roomData.createdAt as Timestamp).toDate(), 'HH');
            const hourKey = `${hour}:00`;
            hourlyData[hourKey] = (hourlyData[hourKey] || 0) + 1;
        }
    });

    const result = Array.from({ length: 24 }).map((_, i) => {
        const hour = i.toString().padStart(2, '0');
        const hourKey = `${hour}:00`;
        return {
            hour: hourKey,
            rooms: hourlyData[hourKey] || 0,
        };
    });

    return result;
}

/**
 * Cinsiyete göre toplam gönderi sayılarını hesaplar.
 */
export async function getContentCreationByGenderData() {
    const postsRef = collection(db, 'posts');
    
    // 'userGender' alanında null/undefined olmayanları saymak daha güvenli olabilir
    // ama şimdilik direkt sorgu atıyoruz.
    const malePostsQuery = query(postsRef, where('userGender', '==', 'male'));
    const femalePostsQuery = query(postsRef, where('userGender', '==', 'female'));
    
    try {
        const [maleSnapshot, femaleSnapshot] = await Promise.all([
            getCountFromServer(malePostsQuery),
            getCountFromServer(femalePostsQuery),
        ]);

        return [
            { name: 'Erkek', gönderi: maleSnapshot.data().count },
            { name: 'Kadın', gönderi: femaleSnapshot.data().count },
        ];
    } catch (error) {
        console.error("Cinsiyete göre gönderi sayısı alınırken hata (indeks gerekli olabilir):", error);
        // Hata durumunda boş veri döndür
        return [
            { name: 'Erkek', gönderi: 0 },
            { name: 'Kadın', gönderi: 0 },
        ];
    }
}

/**
 * En çok elmasa sahip kullanıcıları getirir.
 */
export async function getTopDiamondHolders(): Promise<Partial<UserProfile>[]> {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('diamonds', 'desc'), limit(5));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
        return [];
    }
    
    const users = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
            uid: data.uid,
            username: data.username,
            photoURL: data.photoURL,
            diamonds: data.diamonds,
        };
    });

    return deepSerialize(users);
}
