'use client';
import { Textarea } from '@/components/ui/textarea';

interface Step2BioProps {
    bio: string;
    setBio: (bio: string) => void;
}

export default function Step2Bio({ bio, setBio }: Step2BioProps) {
  return (
    <div className="text-center">
        <h1 className="text-2xl font-bold">Biraz kendinden bahset</h1>
        <p className="text-muted-foreground mt-2">Biyografin, insanların seni daha iyi tanımasına yardımcı olur.</p>
        <Textarea 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Merhaba, ben..."
            className="mt-8 min-h-[120px] rounded-2xl"
            maxLength={150}
        />
        <p className="text-xs text-muted-foreground text-right mt-2">{bio.length} / 150</p>
    </div>
  );
}
