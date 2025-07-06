
// Bu dosya, yeni kayıt olan kullanıcıların profil kurulumunu yaptığı "Onboarding" (Alıştırma) sayfasını yönetir.
// Kullanıcıyı adım adım profil resmi, biyografi ve takip edeceği kişileri seçmeye yönlendirir.
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Step1Welcome from '@/components/onboarding/Step1Welcome';
import Step2Bio from '@/components/onboarding/Step2Bio';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { updateOnboardingData } from '@/lib/actions/userActions';
import { useToast } from '@/hooks/use-toast';

export default function OnboardingPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Her adımdan gelen verileri tutan state'ler.
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  
  useEffect(() => {
    // Auth yüklemesi bittiğinde ve kullanıcı yoksa, kayıt sayfasına yönlendir.
    if (!authLoading && !user) {
      router.replace('/signup');
    }
    // Eğer kullanıcının zaten bir biyografisi varsa, bu onboarding işlemini tamamlamış demektir.
    // Ana sayfaya yönlendir.
    if (userData && userData.bio) {
        router.replace('/home');
    }
  }, [user, userData, authLoading, router]);

  // Tüm adımlar bittiğinde bu fonksiyon çalışır.
  const handleFinish = async () => {
    if (!user || !userData) return;
    setLoading(true);

    try {
        // Sunucu eylemini çağırarak toplanan verileri veritabanına kaydet.
        await updateOnboardingData({
            userId: user.uid,
            avatarDataUrl,
            bio,
            followingUids: [] // This is now empty
        });
        toast({
            title: "Kurulum Tamamlandı!",
            description: "Harika, artık HiweWalk'u kullanmaya hazırsın.",
        });
        router.push('/home');
    } catch (error: any) {
        toast({
            variant: "destructive",
            title: "Hata",
            description: "Profil güncellenirken bir hata oluştu: " + error.message,
        });
        setLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  // Veriler yüklenene kadar yükleme göstergesi.
  if (authLoading || !user || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // İlerleme çubuğu için yüzde hesaplaması.
  const progress = (step / 2) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
            <Progress value={progress} className="mb-8" />
            
            <div className="animate-in fade-in-50 duration-500">
                {/* Mevcut adıma göre ilgili bileşeni render et. */}
                {step === 1 && <Step1Welcome onAvatarChange={setAvatarDataUrl} />}
                {step === 2 && <Step2Bio bio={bio} setBio={setBio} />}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
                 {step > 1 ? (
                    <Button variant="outline" onClick={prevStep}>Geri</Button>
                ) : (
                    // İlk adımda kullanıcı atlayabilir.
                    <Button variant="outline" onClick={() => router.push('/home')}>Atla</Button>
                )}
                {step < 2 ? (
                    <Button onClick={nextStep}>İleri</Button>
                ) : (
                    // Son adımda "Bitir" butonu.
                    <Button onClick={handleFinish} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Bitir
                    </Button>
                )}
            </div>
        </div>
    </div>
  );
}
