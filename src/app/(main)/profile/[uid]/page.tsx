// Bu, bir kullanıcının profil sayfasını oluşturan sunucu bileşenidir.
// Sayfa yüklendiğinde sunucuda çalışır, veritabanından gerekli verileri
// (kullanıcı profili, gönderi sayısı vb.) çeker ve sayfayı oluşturur.
import { doc, getDoc, collection, query, where, getCountFromServer } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import ProfilePosts from '@/components/profile/ProfilePosts';
import ProfileViewLogger from '@/components/profile/ProfileViewLogger';
import { Separator } from '@/components/ui/separator';
import { deepSerialize } from '@/lib/server-utils';
import { Grid3x3, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
      {/* Bu görünmez bileşen, profil görüntüleme olayını kaydeder. */}
      <ProfileViewLogger targetUserId={uid} />
      
      <div className="w-full mx-auto max-w-4xl py-4">
        {/* Profilin üst kısmını (avatar, isim, takipçi sayısı vb.) oluşturan bileşen. */}
        <ProfileHeader profileUser={serializableProfileUser} />
        
        <Separator className="my-4" />

        {/* Sekmeli Gönderiler Bölümü */}
        <Tabs defaultValue="posts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="posts">
                    <Grid3x3 className="h-5 w-5 mr-2" />
                    Gönderiler
                </TabsTrigger>
                <TabsTrigger value="texts">
                    <FileText className="h-5 w-5 mr-2" />
                    Metinler
                </TabsTrigger>
            </TabsList>
            <TabsContent value="posts" className="mt-4">
                <ProfilePosts 
                    userId={uid} 
                    profileUser={serializableProfileUser} 
                    postType="image"
                />
            </TabsContent>
            <TabsContent value="texts" className="mt-4">
                 <ProfilePosts 
                    userId={uid} 
                    profileUser={serializableProfileUser} 
                    postType="text"
                />
            </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
