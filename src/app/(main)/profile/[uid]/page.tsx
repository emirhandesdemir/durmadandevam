// Bu, bir kullanıcının profil sayfasını oluşturan sunucu bileşenidir.
// Sayfa yüklendiğinde sunucuda çalışır, veritabanından gerekli verileri
// (kullanıcı profili, gönderi sayısı vb.) çeker ve sayfayı oluşturur.
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import { Separator } from '@/components/ui/separator';
import { deepSerialize } from '@/lib/server-utils';

interface UserProfilePageProps {
  params: { uid: string };
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
  const { uid } = params;

  // Veritabanı sorguları için referanslar oluştur.
  const profileUserRef = doc(db, 'users', uid);
  const postsQuery = query(collection(db, 'posts'), where('uid', '==', uid));

  // Kullanıcı verisini ve gönderi sayısını aynı anda, paralel olarak çek.
  // Bu, sayfa yükleme süresini optimize eder.
  const [profileUserSnap, postsCountSnap] = await Promise.all([
    getDoc(profileUserRef),
    getCountFromServer(postsQuery)
  ]);

  // Eğer kullanıcı veritabanında bulunamazsa, 404 sayfasına yönlendir.
  if (!profileUserSnap.exists()) {
    notFound();
  }

  // Gelen verileri işle.
  const profileUserData = profileUserSnap.data();
  profileUserData.postCount = postsCountSnap.data().count;

  // Firestore'dan gelen ve Timestamp gibi serileştirilemeyen nesneler içeren veriyi
  // istemci bileşenlerine güvenle aktarılabilen düz JSON formatına çevir.
  const serializableProfileUser = deepSerialize(profileUserData);

  return (
    <>
      <div className="w-full mx-auto max-w-4xl py-4">
        {/* Profilin üst kısmını (avatar, isim, takipçi sayısı vb.) oluşturan bileşen. */}
        <ProfileHeader profileUser={serializableProfileUser} />
        
        <Separator className="my-4" />

        {/* Birleştirilmiş Gönderi Akışı */}
        <ProfilePosts userId={uid} />
      </div>
    </>
  );
}
