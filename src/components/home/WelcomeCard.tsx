
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { PlusCircle, LogIn } from 'lucide-react';

interface WelcomeCardProps {
    name: string;
}

/**
 * Kullanıcıyı karşılayan ve ana eylemleri sunan renkli bir kart.
 * @param {string} name - Oturum açmış kullanıcının adı.
 */
export default function WelcomeCard({ name }: WelcomeCardProps) {
    return (
        <div className="rounded-xl bg-gradient-to-br from-primary via-primary/80 to-orange-500 p-8 text-primary-foreground shadow-lg transition-all duration-300 hover:shadow-2xl">
            <div className="space-y-4 text-center">
                <h1 className="text-3xl font-bold tracking-tight">
                    Merhaba, {name}!
                </h1>
                <p className="text-lg text-primary-foreground/90">
                    Tekrar hoş geldin!
                </p>
                <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:justify-center">
                    <Button
                        asChild
                        size="lg"
                        className="rounded-full bg-white text-primary shadow-md transition-transform hover:scale-105 hover:bg-white/90 active:scale-95"
                    >
                        <Link href="/create-room">
                            <PlusCircle />
                            Oda Oluştur
                        </Link>
                    </Button>
                    <Button
                        asChild
                        size="lg"
                        variant="outline"
                        className="rounded-full border-2 border-white bg-transparent text-white shadow-md transition-transform hover:scale-105 hover:bg-white/10 active:scale-95"
                    >
                        <Link href="/home">
                            <LogIn />
                            Odaya Katıl
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
