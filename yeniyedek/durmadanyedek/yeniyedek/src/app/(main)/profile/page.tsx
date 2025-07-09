// Bu sayfa, kullanıcının kendi profilini düzenleyebileceği arayüzü içerir.
// Düzenleme mantığı karmaşık olduğu için, bu sayfa sadece istemci tarafında
// çalışacak olan `ProfilePageClient` bileşenini sarmalar.
import ProfilePageClient from "@/components/profile/profile-page-client";

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-8">
        <ProfilePageClient />
    </div>
  );
}
