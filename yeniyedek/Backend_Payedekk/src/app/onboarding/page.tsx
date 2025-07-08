'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import Step1Welcome from '@/components/onboarding/Step1Welcome';
import Step2Bio from '@/components/onboarding/Step2Bio';
import Step3Follow from '@/components/onboarding/Step3Follow';
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
  
  // Data states
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null);
  const [bio, setBio] = useState('');
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  
  useEffect(() => {
    // If auth is done loading and there's no user, redirect to signup
    if (!authLoading && !user) {
      router.replace('/signup');
    }
    // If user data is loaded and they have a bio, they've probably completed onboarding.
    if (userData && userData.bio) {
        router.replace('/home');
    }
  }, [user, userData, authLoading, router]);

  const handleFinish = async () => {
    if (!user || !userData) return;
    setLoading(true);

    try {
        await updateOnboardingData({
            userId: user.uid,
            avatarDataUrl,
            bio,
            followingUids
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

  if (authLoading || !user || !userData) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const progress = (step / 3) * 100;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4">
        <div className="w-full max-w-md mx-auto">
            <Progress value={progress} className="mb-8" />
            
            <div className="animate-in fade-in-50 duration-500">
                {step === 1 && <Step1Welcome onAvatarChange={setAvatarDataUrl} />}
                {step === 2 && <Step2Bio bio={bio} setBio={setBio} />}
                {step === 3 && <Step3Follow selectedUids={followingUids} onSelectionChange={setFollowingUids} />}
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4">
                 {step > 1 ? (
                    <Button variant="outline" onClick={prevStep}>Geri</Button>
                ) : (
                    <Button variant="outline" onClick={() => router.push('/home')}>Atla</Button>
                )}
                {step < 3 ? (
                    <Button onClick={nextStep}>İleri</Button>
                ) : (
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
